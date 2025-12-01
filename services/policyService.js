const InsurancePolicy = require('../models/InsurancePolicy');
const Client = require('../models/Client');
const Insurer = require('../models/Insurer');
const PolicyType = require('../models/PolicyType');
const Subagent = require('../models/Subagent');

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
        createdBy: userId
      });
    } else {
      throw new Error('Client information is required');
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
      status: 'draft'
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

const updatePolicy = async (policyId, updateData) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Update allowed fields
    if (updateData.vehicleDetails) {
      policy.vehicleDetails = { ...policy.vehicleDetails, ...updateData.vehicleDetails };
    }
    if (updateData.policyDetails) {
      policy.policyDetails = { ...policy.policyDetails, ...updateData.policyDetails };
    }
    if (updateData.premiumDetails) {
      policy.premiumDetails = { ...policy.premiumDetails, ...updateData.premiumDetails };
    }
    if (updateData.additionalNotes) {
      policy.additionalNotes = { ...policy.additionalNotes, ...updateData.additionalNotes };
    }
    if (updateData.status) {
      policy.status = updateData.status;
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
      .populate('insurer', 'companyName')
      .populate('policyType', 'name code')
      .populate('client', 'name contactNumber email')
      .populate('subagent', 'name code')
      .populate('createdBy', 'username email')
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
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch policies: ${error.message}`);
  }
};

const getPolicyById = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate('insurer')
      .populate('policyType')
      .populate('client')
      .populate('subagent')
      .populate('createdBy', 'username email');

    if (!policy) {
      throw new Error('Policy not found');
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
      throw new Error('Policy not found');
    }

    // Only allow deletion of draft policies
    if (policy.status !== 'draft') {
      throw new Error('Only draft policies can be deleted');
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
  deletePolicy
};

