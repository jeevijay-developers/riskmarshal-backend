const cron = require("node-cron");
const InsurancePolicy = require("../models/InsurancePolicy");
const { sendEmail } = require("../utils/emailService");
const constants = require("../config/constants");

// Scheduler state
let schedulerTask = null;
let lastRunTime = null;
let isRunning = false;
let schedulerConfig = {
  enabled: process.env.ENABLE_RENEWAL_SCHEDULER === "true",
  runHour: parseInt(process.env.RENEWAL_SCHEDULER_HOUR) || 9,
  runMinute: parseInt(process.env.RENEWAL_SCHEDULER_MINUTE) || 0,
};

/**
 * Get the reminder type based on days until expiry
 * @param {number} daysUntilExpiry
 * @returns {string|null}
 */
const getReminderType = (daysUntilExpiry) => {
  if (daysUntilExpiry === 30) return "30-day";
  if (daysUntilExpiry === 7) return "7-day";
  if (daysUntilExpiry >= 1 && daysUntilExpiry <= 6) return "daily";
  return null;
};

/**
 * Check if a reminder should be sent for a policy
 * @param {Object} policy
 * @param {number} daysUntilExpiry
 * @returns {boolean}
 */
const shouldSendReminder = (policy, daysUntilExpiry) => {
  // Skip if already renewed
  if (policy.renewalTracking?.status === "renewed") {
    return false;
  }

  const reminderType = getReminderType(daysUntilExpiry);
  if (!reminderType) return false;

  const contactHistory = policy.renewalTracking?.contactHistory || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For 30-day and 7-day reminders, check if already sent for this type
  if (reminderType === "30-day" || reminderType === "7-day") {
    const alreadySent = contactHistory.some((contact) => {
      const contactDate = new Date(contact.date);
      contactDate.setHours(0, 0, 0, 0);
      // Check if this type was sent in the appropriate window
      return contact.reminderType === reminderType;
    });
    return !alreadySent;
  }

  // For daily reminders, check if sent today
  if (reminderType === "daily") {
    const sentToday = contactHistory.some((contact) => {
      const contactDate = new Date(contact.date);
      contactDate.setHours(0, 0, 0, 0);
      return contactDate.getTime() === today.getTime();
    });
    return !sentToday;
  }

  return false;
};

/**
 * Get policies that need reminders today
 * @returns {Promise<Array>}
 */
const getPoliciesToRemind = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const policiesToRemind = [];

  // Get policies for each reminder threshold
  const thresholds = [30, 7, 6, 5, 4, 3, 2, 1];

  for (const days of thresholds) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const policies = await InsurancePolicy.find({
      "policyDetails.insuranceEndDate": {
        $gte: targetDate,
        $lt: nextDay,
      },
      status: { $in: ["active", "payment_approved"] },
      "renewalTracking.status": { $ne: "renewed" },
    })
      .populate("client")
      .populate("insurer")
      .populate("policyType");

    for (const policy of policies) {
      if (shouldSendReminder(policy, days)) {
        policiesToRemind.push({
          policy,
          daysUntilExpiry: days,
          reminderType: getReminderType(days),
        });
      }
    }
  }

  return policiesToRemind;
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
 * Generate reminder email HTML
 */
const generateReminderEmailHTML = (policy, daysUntilExpiry, reminderType) => {
  const expiryDate = formatDate(policy.policyDetails?.insuranceEndDate);
  const urgencyColor =
    daysUntilExpiry <= 3 ? "#e74c3c" : daysUntilExpiry <= 7 ? "#f39c12" : "#3498db";
  const urgencyText =
    daysUntilExpiry <= 3
      ? "URGENT: Expires Very Soon!"
      : daysUntilExpiry <= 7
      ? "Important: Expiring This Week"
      : "Renewal Reminder";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: ${urgencyColor}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">${urgencyText}</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
        <p>Dear ${policy.client?.name || "Customer"},</p>
        <p>Your insurance policy is <strong>expiring in ${daysUntilExpiry} day${
    daysUntilExpiry > 1 ? "s" : ""
  }</strong>. Please renew to ensure uninterrupted coverage.</p>
        
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
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${urgencyColor}; font-weight: bold;">${expiryDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Premium:</strong></td>
              <td style="padding: 8px;">₹${
                policy.premiumDetails?.finalPremium?.toLocaleString("en-IN") || "N/A"
              }</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/renewals" 
             style="background-color: #ab792e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Renew Now
          </a>
        </div>
      </div>
      <div style="background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px;">Risk Marshal Insurance Services</p>
        <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated reminder. Contact us for assistance.</p>
      </div>
    </div>
  `;
};

/**
 * Send a renewal reminder for a policy
 */
const sendAutomatedReminder = async (policy, daysUntilExpiry, reminderType) => {
  const client = policy.client;
  if (!client?.email) {
    console.log(`Skipping policy ${policy._id}: No client email`);
    return { success: false, reason: "No client email" };
  }

  const subject = `${
    daysUntilExpiry <= 3 ? "URGENT: " : ""
  }Renewal Reminder - Your ${
    policy.policyType?.name || "Insurance"
  } Policy Expires in ${daysUntilExpiry} Day${daysUntilExpiry > 1 ? "s" : ""}`;

  const textMessage = `
Dear ${client.name || "Customer"},

Your ${policy.policyType?.name || "insurance"} policy is expiring in ${daysUntilExpiry} day${
    daysUntilExpiry > 1 ? "s" : ""
  }.

Policy Number: ${policy.policyDetails?.policyNumber || "N/A"}
Expiry Date: ${formatDate(policy.policyDetails?.insuranceEndDate)}
Premium: ₹${policy.premiumDetails?.finalPremium?.toLocaleString("en-IN") || "N/A"}

Please contact us to renew your policy and ensure uninterrupted coverage.

Best regards,
Risk Marshal Team
  `.trim();

  const htmlMessage = generateReminderEmailHTML(policy, daysUntilExpiry, reminderType);

  try {
    await sendEmail(client.email, subject, textMessage, htmlMessage);

    // Update renewal tracking
    if (!policy.renewalTracking) {
      policy.renewalTracking = {};
    }
    policy.renewalTracking.status = "contacted";
    policy.renewalTracking.lastContacted = new Date();
    policy.renewalTracking.contactHistory = policy.renewalTracking.contactHistory || [];
    policy.renewalTracking.contactHistory.push({
      date: new Date(),
      channels: ["email"],
      subject,
      message: textMessage,
      reminderType,
      automated: true,
      results: { success: true },
    });
    await policy.save();

    console.log(
      `✓ Sent ${reminderType} reminder to ${client.email} for policy ${policy.policyDetails?.policyNumber}`
    );
    return { success: true };
  } catch (error) {
    console.error(`✗ Failed to send reminder for policy ${policy._id}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Run the daily renewal check
 */
const runDailyRenewalCheck = async () => {
  if (isRunning) {
    console.log("Renewal check already in progress, skipping...");
    return { success: false, reason: "Already running" };
  }

  isRunning = true;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Renewal Scheduler - Starting at ${new Date().toISOString()}`);
  console.log(`${"=".repeat(50)}`);

  const results = {
    startTime: new Date(),
    endTime: null,
    totalPolicies: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  try {
    const policiesToRemind = await getPoliciesToRemind();
    results.totalPolicies = policiesToRemind.length;

    console.log(`Found ${policiesToRemind.length} policies needing reminders`);

    for (const { policy, daysUntilExpiry, reminderType } of policiesToRemind) {
      const result = await sendAutomatedReminder(policy, daysUntilExpiry, reminderType);
      results.details.push({
        policyId: policy._id,
        policyNumber: policy.policyDetails?.policyNumber,
        client: policy.client?.name,
        daysUntilExpiry,
        reminderType,
        ...result,
      });

      if (result.success) {
        results.sent++;
      } else if (result.reason === "No client email") {
        results.skipped++;
      } else {
        results.failed++;
      }

      // Small delay to avoid overwhelming email server
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    results.endTime = new Date();
    lastRunTime = results.endTime;

    console.log(`\nRenewal Check Complete:`);
    console.log(`  - Total: ${results.totalPolicies}`);
    console.log(`  - Sent: ${results.sent}`);
    console.log(`  - Failed: ${results.failed}`);
    console.log(`  - Skipped: ${results.skipped}`);
    console.log(`${"=".repeat(50)}\n`);

    return results;
  } catch (error) {
    console.error("Renewal scheduler error:", error);
    results.endTime = new Date();
    results.error = error.message;
    return results;
  } finally {
    isRunning = false;
  }
};

/**
 * Start the scheduler
 */
const startScheduler = () => {
  if (!schedulerConfig.enabled) {
    console.log("Renewal scheduler is disabled. Set ENABLE_RENEWAL_SCHEDULER=true to enable.");
    return;
  }

  const cronExpression = `${schedulerConfig.runMinute} ${schedulerConfig.runHour} * * *`;
  console.log(
    `Starting renewal scheduler - will run daily at ${schedulerConfig.runHour}:${String(
      schedulerConfig.runMinute
    ).padStart(2, "0")}`
  );

  schedulerTask = cron.schedule(cronExpression, async () => {
    await runDailyRenewalCheck();
  });

  console.log("Renewal scheduler started successfully");
};

/**
 * Stop the scheduler
 */
const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log("Renewal scheduler stopped");
  }
};

/**
 * Get scheduler status
 */
const getSchedulerStatus = () => {
  return {
    enabled: schedulerConfig.enabled,
    running: isRunning,
    scheduledTime: `${schedulerConfig.runHour}:${String(schedulerConfig.runMinute).padStart(
      2,
      "0"
    )}`,
    lastRunTime,
    nextRunTime: schedulerTask
      ? `Tomorrow at ${schedulerConfig.runHour}:${String(schedulerConfig.runMinute).padStart(
          2,
          "0"
        )}`
      : null,
  };
};

/**
 * Update scheduler configuration
 */
const updateSchedulerConfig = (newConfig) => {
  if (typeof newConfig.enabled === "boolean") {
    schedulerConfig.enabled = newConfig.enabled;
  }
  if (newConfig.runHour !== undefined) {
    schedulerConfig.runHour = parseInt(newConfig.runHour);
  }
  if (newConfig.runMinute !== undefined) {
    schedulerConfig.runMinute = parseInt(newConfig.runMinute);
  }

  // Restart scheduler with new config
  stopScheduler();
  if (schedulerConfig.enabled) {
    startScheduler();
  }

  return schedulerConfig;
};

module.exports = {
  startScheduler,
  stopScheduler,
  runDailyRenewalCheck,
  getSchedulerStatus,
  updateSchedulerConfig,
  getPoliciesToRemind,
};
