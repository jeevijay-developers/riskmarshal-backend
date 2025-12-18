const InsurancePolicy = require("../models/InsurancePolicy");
const Client = require("../models/Client");
const Insurer = require("../models/Insurer");
const PolicyType = require("../models/PolicyType");
const Subagent = require("../models/Subagent");

const createPolicy = async (policyData, userId) => {
  try {
    // Ensure client exists or create it
    let client;
    if (policyData.clientId) {
      client = await Client.findById(policyData.clientId);
    } else if (policyData.client) {
      // Create new client
      client = await Client.create({
        ...policyData.client,
        createdBy: userId,
      });
    } else {
      throw new Error("Client information is required");
    }

    // Create policy
    const policy = await InsurancePolicy.create({
      insurer: policyData.insurerId,
      policyType: policyData.policyTypeId,
      client: client._id,
      subagent: policyData.subagentId,
      vehicleDetails: policyData.vehicleDetails || {},
      policyDetails: policyData.policyDetails || {},
      premiumDetails: policyData.premiumDetails || {},
      additionalNotes: policyData.additionalNotes || {},
      agentDetails: policyData.agentDetails || {},
      branchDetails: policyData.branchDetails || {},
      createdBy: userId,
      status: "draft",
    });

    // Update client's policies array
    client.policies.push(policy._id);
    await client.save();

    // Update subagent's policies array if subagent exists
    if (policyData.subagentId) {
      const subagent = await Subagent.findById(policyData.subagentId);
      if (subagent) {
        subagent.policies.push(policy._id);
        await subagent.save();
      }
    }

    return policy;
  } catch (error) {
    throw new Error(`Policy creation failed: ${error.message}`);
  }
};

const cleanObject = (value) => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const arr = value.map((v) => cleanObject(v)).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, cleanObject(v)])
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
};

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === "function") {
    return value.toObject({
      getters: false,
      virtuals: false,
      depopulate: true,
    });
  }
  if (typeof value === "object") return { ...value };
  return {};
};

const parseDateInput = (value) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const m = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return isNaN(d.getTime()) ? undefined : d;
    }
    const iso = new Date(trimmed);
    return isNaN(iso.getTime()) ? undefined : iso;
  }
  return undefined;
};

const normalizePolicyDetails = (details = {}) => {
  const normalized = { ...toPlainObject(details) };
  const dateKeys = [
    "periodFrom",
    "periodTo",
    "insuranceStartDate",
    "insuranceEndDate",
    "invoiceDate",
  ];

  for (const key of dateKeys) {
    if (normalized[key] !== undefined) {
      const parsed = parseDateInput(normalized[key]);
      if (parsed) normalized[key] = parsed;
      else delete normalized[key];
    }
  }

  if (normalized.previousPolicy) {
    const prev = { ...normalized.previousPolicy };
    for (const key of ["validFrom", "validTo"]) {
      if (prev[key] !== undefined) {
        const parsed = parseDateInput(prev[key]);
        if (parsed) prev[key] = parsed;
        else delete prev[key];
      }
    }
    normalized.previousPolicy = Object.keys(prev).length ? prev : undefined;
  }

  return normalized;
};

const scrubPolicyDetails = (details = {}) => {
  const normalized = normalizePolicyDetails(details);

  if (!normalized || typeof normalized !== "object") return {};

  if (normalized.paymentDetails) {
    const pd = cleanObject(normalized.paymentDetails);
    normalized.paymentDetails = pd && typeof pd === "object" ? pd : undefined;
  }
  if (normalized.previousPolicy) {
    const prev = cleanObject(normalized.previousPolicy);
    normalized.previousPolicy =
      prev && typeof prev === "object" ? prev : undefined;
  }

  const cleaned = cleanObject(normalized) || {};
  return cleaned;
};

const updatePolicy = async (policyId, updateData) => {
  try {
    console.log("[policyService.updatePolicy] incoming", {
      policyId,
      updateData,
    });

    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const safeUpdate = cleanObject(updateData || {});

    console.log("[policyService.updatePolicy] cleaned", safeUpdate);

    // Update allowed fields
    if (safeUpdate?.vehicleDetails) {
      policy.vehicleDetails = {
        ...policy.vehicleDetails,
        ...safeUpdate.vehicleDetails,
      };
    }
    if (safeUpdate?.policyDetails) {
      const currentNormalized = scrubPolicyDetails(policy.policyDetails || {});
      const incomingNormalized = scrubPolicyDetails(safeUpdate.policyDetails);
      const mergedDetails = scrubPolicyDetails({
        ...currentNormalized,
        ...incomingNormalized,
      });
      policy.policyDetails = mergedDetails;

      console.log("[policyService.updatePolicy] normalized policyDetails", {
        currentNormalized,
        incomingNormalized,
        mergedDetails,
      });
    }
    if (safeUpdate?.client) {
      policy.client = safeUpdate.client;
    }
    if (safeUpdate?.subagent) {
      policy.subagent = safeUpdate.subagent;
    }
    if (safeUpdate?.premiumDetails) {
      policy.premiumDetails = {
        ...policy.premiumDetails,
        ...safeUpdate.premiumDetails,
      };
    }
    if (safeUpdate?.additionalNotes) {
      policy.additionalNotes = {
        ...policy.additionalNotes,
        ...safeUpdate.additionalNotes,
      };
    }
    if (safeUpdate?.status) {
      policy.status = safeUpdate.status;
    }

    // Remove undefined or invalid nested subdocs to avoid cast errors
    if (policy.policyDetails) {
      policy.policyDetails = scrubPolicyDetails(policy.policyDetails);
    }

    await policy.save();
    return policy;
  } catch (error) {
    throw new Error(`Policy update failed: ${error.message}`);
  }
};

const getPolicies = async (filters = {}, options = {}) => {
  try {
    const query = {};

    if (filters.insurer) {
      query.insurer = filters.insurer;
    }
    if (filters.policyType) {
      query.policyType = filters.policyType;
    }
    if (filters.client) {
      query.client = filters.client;
    }
    if (filters.subagent) {
      query.subagent = filters.subagent;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    const policies = await InsurancePolicy.find(query)
      .populate("insurer", "companyName")
      .populate("policyType", "name code")
      .populate("client", "name contactNumber email")
      .populate("subagent", "name code")
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await InsurancePolicy.countDocuments(query);

    return {
      policies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch policies: ${error.message}`);
  }
};

const getPolicyById = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("insurer")
      .populate("policyType")
      .populate("client")
      .populate("subagent")
      .populate("createdBy", "username email");

    if (!policy) {
      throw new Error("Policy not found");
    }

    return policy;
  } catch (error) {
    throw new Error(`Failed to fetch policy: ${error.message}`);
  }
};

const deletePolicy = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    // Only allow deletion of draft policies
    if (policy.status !== "draft") {
      throw new Error("Only draft policies can be deleted");
    }

    await InsurancePolicy.findByIdAndDelete(policyId);
    return { success: true };
  } catch (error) {
    throw new Error(`Policy deletion failed: ${error.message}`);
  }
};

module.exports = {
  createPolicy,
  updatePolicy,
  getPolicies,
  getPolicyById,
  deletePolicy,
};
