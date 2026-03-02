const mongoose = require("mongoose");

const RenewalConfigSchema = new mongoose.Schema(
  {
    reminderWindows: {
      type: [Number],
      default: [60, 30, 15, 7], // Days before policy expiry to send reminders
    },
    clientEmailTemplate: {
      type: String,
      default: "Your insurance policy with {{insurerName}} is expiring in {{days}} days. Please contact your agent to renew.",
    },
    intermediaryEmailTemplate: {
      type: String,
      default: "Your client {{clientName}}'s policy {{policyNumber}} is expiring in {{days}} days. Please follow up for renewal.",
    },
    cronSchedule: {
      type: String,
      default: "0 8 * * *", // Runs every day at 8:00 AM
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RenewalConfig", RenewalConfigSchema);
