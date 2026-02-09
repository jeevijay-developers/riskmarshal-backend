const InsurancePolicy = require("../models/InsurancePolicy");
const { sendEmail } = require("../utils/emailService");
const { sendSMS } = require("../utils/smsService");
const { sendWhatsApp } = require("../utils/whatsappService");
const constants = require("../config/constants");

/**
 * Get policies due for renewal within specified days
 * @param {number} daysAhead - Number of days to look ahead
 * @returns {Promise<Array>} - List of policies due for renewal
 */
const getPoliciesDueForRenewal = async (daysAhead = 30) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    // Query both insuranceEndDate and periodTo for backward compatibility
    const policies = await InsurancePolicy.find({
      $or: [
        {
          "policyDetails.insuranceEndDate": {
            $gte: today,
            $lte: futureDate,
          },
        },
        {
          "policyDetails.periodTo": {
            $gte: today,
            $lte: futureDate,
          },
        },
      ],
      status: { $in: ["active", "payment_approved"] },
    })
      .populate("client")
      .populate("insurer")
      .populate("policyType")
      .populate("subagent")
      .sort({ "policyDetails.insuranceEndDate": 1, "policyDetails.periodTo": 1 });

    return policies.map((policy) => formatRenewalData(policy));
  } catch (error) {
    throw new Error(`Failed to get renewal policies: ${error.message}`);
  }
};

/**
 * Get overdue policies (already expired)
 * @returns {Promise<Array>} - List of overdue policies
 */
const getOverduePolicies = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query both insuranceEndDate and periodTo for backward compatibility
    const policies = await InsurancePolicy.find({
      $or: [
        {
          "policyDetails.insuranceEndDate": {
            $gte: thirtyDaysAgo,
            $lt: today,
          },
        },
        {
          "policyDetails.periodTo": {
            $gte: thirtyDaysAgo,
            $lt: today,
          },
        },
      ],
      status: { $in: ["active", "payment_approved", "expired"] },
    })
      .populate("client")
      .populate("insurer")
      .populate("policyType")
      .populate("subagent")
      .sort({ "policyDetails.insuranceEndDate": 1, "policyDetails.periodTo": 1 });

    return policies.map((policy) => formatRenewalData(policy));
  } catch (error) {
    throw new Error(`Failed to get overdue policies: ${error.message}`);
  }
};

/**
 * Get all renewal data with categorization
 * @returns {Promise<Object>} - Categorized renewal data
 */
const getAllRenewals = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAhead = new Date();
    ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90);

    // Query both insuranceEndDate and periodTo for backward compatibility
    const policies = await InsurancePolicy.find({
      $or: [
        {
          "policyDetails.insuranceEndDate": {
            $gte: thirtyDaysAgo,
            $lte: ninetyDaysAhead,
          },
        },
        {
          "policyDetails.periodTo": {
            $gte: thirtyDaysAgo,
            $lte: ninetyDaysAhead,
          },
        },
      ],
      status: { $in: ["active", "payment_approved", "expired"] },
    })
      .populate("client")
      .populate("insurer")
      .populate("policyType")
      .populate("subagent")
      .sort({ "policyDetails.insuranceEndDate": 1, "policyDetails.periodTo": 1 });

    const renewals = policies.map((policy) => formatRenewalData(policy));

    // Categorize renewals
    const overdue = renewals.filter((r) => r.daysUntilExpiry < 0);
    const urgent = renewals.filter(
      (r) => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 7
    );
    const pendingRenewal = renewals.filter(
      (r) => r.daysUntilExpiry > 7 && r.daysUntilExpiry <= 30
    );
    const upcoming = renewals.filter((r) => r.daysUntilExpiry > 30);

    return {
      all: renewals,
      overdue,
      urgent,
      pendingRenewal,
      upcoming,
      stats: {
        total: renewals.length,
        overdueCount: overdue.length,
        urgentCount: urgent.length,
        pendingCount: pendingRenewal.length,
        upcomingCount: upcoming.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get all renewals: ${error.message}`);
  }
};

/**
 * Get single renewal by policy ID
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object>} - Renewal data
 */
const getRenewalById = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("client")
      .populate("insurer")
      .populate("policyType")
      .populate("subagent");

    if (!policy) {
      throw new Error("Policy not found");
    }

    return formatRenewalData(policy);
  } catch (error) {
    throw new Error(`Failed to get renewal: ${error.message}`);
  }
};

/**
 * Update renewal status and notes
 * @param {string} policyId - Policy ID
 * @param {Object} updateData - Update data (renewalStatus, notes)
 * @returns {Promise<Object>} - Updated renewal data
 */
const updateRenewalStatus = async (policyId, updateData) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);

    if (!policy) {
      throw new Error("Policy not found");
    }

    // Store renewal tracking data in additionalNotes or a new field
    if (!policy.renewalTracking) {
      policy.renewalTracking = {};
    }

    if (updateData.renewalStatus) {
      policy.renewalTracking.status = updateData.renewalStatus;
    }

    if (updateData.notes) {
      policy.renewalTracking.notes = updateData.notes;
    }

    policy.renewalTracking.lastUpdated = new Date();

    await policy.save();

    return getRenewalById(policyId);
  } catch (error) {
    throw new Error(`Failed to update renewal: ${error.message}`);
  }
};

/**
 * Send renewal reminder to client
 * @param {string} policyId - Policy ID
 * @param {Object} messageData - Message subject and content
 * @param {Array} channels - Communication channels (email, sms, whatsapp)
 * @param {boolean} notifyAdmin - Whether to notify admin as well
 * @returns {Promise<Object>} - Send results
 */
const sendRenewalReminder = async (
  policyId,
  messageData,
  channels = ["email"],
  notifyAdmin = true
) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("client")
      .populate("insurer")
      .populate("policyType");

    if (!policy) {
      throw new Error("Policy not found");
    }

    const results = [];
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const adminPhone = process.env.ADMIN_PHONE;

    const client = policy.client;
    const { subject, message } = messageData;

    // Generate HTML for email
    const htmlMessage = generateRenewalEmailHTML(policy, message);

    // Send to client via requested channels
    if (channels.includes("email") && client?.email) {
      try {
        const result = await sendEmail(
          client.email,
          subject,
          message,
          htmlMessage
        );
        results.push({
          channel: "email",
          recipient: "client",
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          channel: "email",
          recipient: "client",
          success: false,
          error: error.message,
        });
      }
    }

    if (channels.includes("sms") && client?.contactNumber) {
      try {
        const result = await sendSMS(client.contactNumber, message);
        results.push({
          channel: "sms",
          recipient: "client",
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          channel: "sms",
          recipient: "client",
          success: false,
          error: error.message,
        });
      }
    }

    if (channels.includes("whatsapp") && client?.contactNumber) {
      try {
        const result = await sendWhatsApp(client.contactNumber, message);
        results.push({
          channel: "whatsapp",
          recipient: "client",
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          channel: "whatsapp",
          recipient: "client",
          success: false,
          error: error.message,
        });
      }
    }

    // Notify admin/self
    if (notifyAdmin && adminEmail) {
      try {
        const adminSubject = `[RENEWAL REMINDER SENT] ${
          policy.policyDetails?.policyNumber || policyId
        }`;
        const adminMessage = `
Renewal reminder sent to client.

Client: ${client?.name || "N/A"}
Policy Number: ${policy.policyDetails?.policyNumber || "N/A"}
Policy Type: ${policy.policyType?.name || "N/A"}
Expiry Date: ${formatDate(policy.policyDetails?.insuranceEndDate)}
Premium: ₹${policy.premiumDetails?.finalPremium || "N/A"}

Original Message:
${message}
        `;

        const result = await sendEmail(adminEmail, adminSubject, adminMessage);
        results.push({
          channel: "email",
          recipient: "admin",
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          channel: "email",
          recipient: "admin",
          success: false,
          error: error.message,
        });
      }
    }

    // Update renewal tracking
    if (!policy.renewalTracking) {
      policy.renewalTracking = {};
    }
    policy.renewalTracking.status = "contacted";
    policy.renewalTracking.lastContacted = new Date();
    policy.renewalTracking.contactHistory =
      policy.renewalTracking.contactHistory || [];
    policy.renewalTracking.contactHistory.push({
      date: new Date(),
      channels,
      subject,
      message,
      results,
    });
    await policy.save();

    return {
      success: true,
      results,
      policy: formatRenewalData(policy),
    };
  } catch (error) {
    throw new Error(`Failed to send renewal reminder: ${error.message}`);
  }
};

/**
 * Process a renewal: roll dates forward and mark as renewed
 * @param {string} policyId
 * @param {Object} payload
 * @param {Date|string} [payload.insuranceStartDate]
 * @param {Date|string} [payload.insuranceEndDate]
 * @returns {Promise<Object>}
 */
const processRenewal = async (
  policyId,
  { insuranceStartDate, insuranceEndDate } = {}
) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);

    if (!policy) {
      throw new Error("Policy not found");
    }

    // Infer start/end if not provided: start = day after current end (or today), end = start + 1 year - 1 day
    const currentEnd = policy.policyDetails?.insuranceEndDate
      ? new Date(policy.policyDetails.insuranceEndDate)
      : new Date();

    const derivedStart = new Date(currentEnd);
    derivedStart.setDate(derivedStart.getDate() + 1);

    const derivedEnd = new Date(derivedStart);
    derivedEnd.setFullYear(derivedEnd.getFullYear() + 1);
    derivedEnd.setDate(derivedEnd.getDate() - 1);

    const startDate = insuranceStartDate
      ? new Date(insuranceStartDate)
      : derivedStart;
    const endDate = insuranceEndDate ? new Date(insuranceEndDate) : derivedEnd;

    policy.policyDetails = policy.policyDetails || {};
    policy.policyDetails.insuranceStartDate = startDate;
    policy.policyDetails.insuranceEndDate = endDate;
    policy.status = "active";

    policy.renewalTracking = policy.renewalTracking || {};
    policy.renewalTracking.status = "renewed";
    policy.renewalTracking.lastUpdated = new Date();

    await policy.save();

    return formatRenewalData(policy);
  } catch (error) {
    throw new Error(`Failed to process renewal: ${error.message}`);
  }
};

/**
 * Send bulk renewal reminders based on date criteria
 * @param {number} daysBeforeExpiry - Send reminders for policies expiring in X days
 * @param {Array} channels - Communication channels
 * @returns {Promise<Object>} - Bulk send results
 */
const sendBulkRenewalReminders = async (
  daysBeforeExpiry = 30,
  channels = ["email"]
) => {
  try {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);

    // Get policies expiring on the target date (±1 day tolerance)
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const policies = await InsurancePolicy.find({
      "policyDetails.insuranceEndDate": {
        $gte: startDate,
        $lte: endDate,
      },
      status: { $in: ["active", "payment_approved"] },
      // Don't send to already contacted in last 7 days
      $or: [
        { "renewalTracking.lastContacted": { $exists: false } },
        {
          "renewalTracking.lastContacted": {
            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    })
      .populate("client")
      .populate("insurer")
      .populate("policyType");

    const results = [];

    for (const policy of policies) {
      const expiryDate = formatDate(policy.policyDetails?.insuranceEndDate);
      const messageData = {
        subject: `Renewal Reminder - Your ${
          policy.policyType?.name || "Insurance"
        } Policy Expires on ${expiryDate}`,
        message: generateDefaultRenewalMessage(policy),
      };

      try {
        const result = await sendRenewalReminder(
          policy._id.toString(),
          messageData,
          channels,
          true
        );
        results.push({
          policyId: policy._id,
          policyNumber: policy.policyDetails?.policyNumber,
          client: policy.client?.name,
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          policyId: policy._id,
          policyNumber: policy.policyDetails?.policyNumber,
          client: policy.client?.name,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      totalPolicies: policies.length,
      results,
      summary: {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to send bulk reminders: ${error.message}`);
  }
};

/**
 * Get renewal statistics
 * @returns {Promise<Object>} - Renewal statistics
 */
const getRenewalStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Policies due this month
    const dueThisMonth = await InsurancePolicy.countDocuments({
      "policyDetails.insuranceEndDate": {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
      status: { $in: ["active", "payment_approved"] },
    });

    // Overdue policies
    const overdue = await InsurancePolicy.countDocuments({
      "policyDetails.insuranceEndDate": {
        $lt: today,
        $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
      status: { $in: ["active", "payment_approved", "expired"] },
    });

    // Renewed this month (either marked renewed via tracking or new policy derived from previous policy)
    const renewed = await InsurancePolicy.countDocuments({
      $or: [
        {
          "renewalTracking.status": "renewed",
          "renewalTracking.lastUpdated": {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
        {
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
          "policyDetails.previousPolicy.policyNumber": {
            $exists: true,
            $ne: "",
          },
        },
      ],
    });

    // Calculate renewal rate
    const totalDueLastMonth = await InsurancePolicy.countDocuments({
      "policyDetails.insuranceEndDate": {
        $gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        $lt: startOfMonth,
      },
    });

    const renewalRate =
      totalDueLastMonth > 0
        ? Math.round((renewed / totalDueLastMonth) * 100)
        : 0;

    return {
      dueThisMonth,
      overdue,
      renewed,
      renewalRate,
    };
  } catch (error) {
    throw new Error(`Failed to get renewal stats: ${error.message}`);
  }
};

// ============ HELPER FUNCTIONS ============

/**
 * Format policy data for renewal response
 */
const formatRenewalData = (policy) => {
  const today = new Date();
  // Use insuranceEndDate if available, fallback to periodTo
  const expiryDate = policy.policyDetails?.insuranceEndDate
    ? new Date(policy.policyDetails.insuranceEndDate)
    : policy.policyDetails?.periodTo
    ? new Date(policy.policyDetails.periodTo)
    : null;

  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    : null;

  let status = "Upcoming";
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) status = "Overdue";
    else if (daysUntilExpiry <= 7) status = "Urgent";
    else if (daysUntilExpiry <= 30) status = "Pending Renewal";
  }

  return {
    policyId: policy._id,
    policyNumber: policy.policyDetails?.policyNumber || "N/A",
    client: policy.client?.name || "N/A",
    clientEmail: policy.client?.email || "",
    clientPhone: policy.client?.contactNumber || "",
    vehicleDetails: {
      manufacturer: policy.vehicleDetails?.manufacturer || "",
      model: policy.vehicleDetails?.model || "",
    },
    policyType: policy.policyType?.name || "N/A",
    insurer: policy.insurer?.companyName || "N/A",
    currentPremium: policy.premiumDetails?.finalPremium
      ? `₹${policy.premiumDetails.finalPremium.toLocaleString("en-IN")}`
      : "N/A",
    newPremium: policy.premiumDetails?.finalPremium
      ? `₹${Math.round(
          policy.premiumDetails.finalPremium * 1.05
        ).toLocaleString("en-IN")}`
      : "N/A", // Default 5% increase estimate
    expiryDate: expiryDate || null,
    daysUntilExpiry,
    status,
    renewalStatus: policy.renewalTracking?.status || "not_contacted",
    notes: policy.renewalTracking?.notes || "",
    lastContacted: policy.renewalTracking?.lastContacted || null,
    contactHistory: policy.renewalTracking?.contactHistory || [],
  };
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Generate default renewal message
 */
const generateDefaultRenewalMessage = (policy) => {
  const expiryDate = formatDate(policy.policyDetails?.periodTo);
  return `
Dear ${policy.client?.name || "Customer"},

This is a reminder that your ${
    policy.policyType?.name || "insurance"
  } policy is due for renewal.

Policy Details:
- Policy Number: ${policy.policyDetails?.policyNumber || "N/A"}
- Insurer: ${policy.insurer?.companyName || "N/A"}
- Expiry Date: ${expiryDate}
- Current Premium: ₹${
    policy.premiumDetails?.finalPremium?.toLocaleString("en-IN") || "N/A"
  }

Please contact us at your earliest convenience to process the renewal and ensure uninterrupted coverage.

Best regards,
Risk Marshal Team
  `.trim();
};

/**
 * Generate HTML email for renewal reminder
 */
const generateRenewalEmailHTML = (policy, message) => {
  const expiryDate = formatDate(policy.policyDetails?.periodTo);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ab792e; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Policy Renewal Reminder</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
        <p>Dear ${policy.client?.name || "Customer"},</p>
        <p>Your insurance policy is due for renewal. Please review the details below:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Policy Number:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                policy.policyDetails?.policyNumber || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Policy Type:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                policy.policyType?.name || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Insurer:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                policy.insurer?.companyName || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Expiry Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #e74c3c; font-weight: bold;">${expiryDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Premium:</strong></td>
              <td style="padding: 8px;">₹${
                policy.premiumDetails?.finalPremium?.toLocaleString("en-IN") ||
                "N/A"
              }</td>
            </tr>
          </table>
        </div>
        
        <div style="white-space: pre-line; margin: 20px 0;">${message}</div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${
            process.env.FRONTEND_URL || "http://localhost:3000"
          }/dashboard/renewals" 
             style="background-color: #ab792e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Renew Now
          </a>
        </div>
      </div>
      <div style="background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px;">Risk Marshal Insurance Services</p>
        <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated message. Please do not reply directly.</p>
      </div>
    </div>
  `;
};

module.exports = {
  getPoliciesDueForRenewal,
  getOverduePolicies,
  getAllRenewals,
  getRenewalById,
  updateRenewalStatus,
  sendRenewalReminder,
  sendBulkRenewalReminders,
  processRenewal,
  getRenewalStats,
};
