const { sendQuotationEmail } = require("../utils/emailService");
const { sendQuotationSMS } = require("../utils/smsService");
const { sendQuotationWhatsApp } = require("../utils/whatsappService");
const InsurancePolicy = require("../models/InsurancePolicy");
const constants = require("../config/constants");

const sendQuotation = async (
  policyId,
  channels,
  recipient = null,
  paymentLink = null
) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("client")
      .populate("insurer")
      .populate("policyType");

    if (!policy) {
      throw new Error("Policy not found");
    }

    if (!policy.quotationPdfUrl) {
      throw new Error("Quotation PDF not generated yet");
    }

    // Persist payment link if provided
    if (paymentLink) {
      policy.paymentLink = paymentLink;
    }

    if (
      ![
        constants.POLICY_STATUS.PAYMENT_APPROVED,
        constants.POLICY_STATUS.ACTIVE,
      ].includes(policy.status)
    ) {
      policy.status = constants.POLICY_STATUS.PAYMENT_PENDING;
    }
    policy.paymentStatus = constants.PAYMENT_STATUS.PENDING;
    await policy.save();

    const results = [];
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const quotationUrl = `${baseUrl}${policy.quotationPdfUrl}`;

    // Determine recipient
    const email = recipient?.email || policy.client?.email;
    const phoneNumber = recipient?.phone || policy.client?.contactNumber;

    // Send via requested channels
    if (channels.includes("email") && email) {
      try {
        const result = await sendQuotationEmail(
          email,
          policy,
          quotationUrl,
          paymentLink || policy.paymentLink
        );
        results.push({ channel: "email", success: true, ...result });
      } catch (error) {
        results.push({
          channel: "email",
          success: false,
          error: error.message,
        });
      }
    }

    if (channels.includes("sms") && phoneNumber) {
      try {
        const result = await sendQuotationSMS(
          phoneNumber,
          policy,
          quotationUrl,
          paymentLink || policy.paymentLink
        );
        results.push({ channel: "sms", success: true, ...result });
      } catch (error) {
        results.push({ channel: "sms", success: false, error: error.message });
      }
    }

    if (channels.includes("whatsapp") && phoneNumber) {
      try {
        const result = await sendQuotationWhatsApp(
          phoneNumber,
          policy,
          quotationUrl,
          paymentLink || policy.paymentLink
        );
        results.push({ channel: "whatsapp", success: true, ...result });
      } catch (error) {
        results.push({
          channel: "whatsapp",
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      results,
      paymentLink: policy.paymentLink,
    };
  } catch (error) {
    throw new Error(`Communication service failed: ${error.message}`);
  }
};

module.exports = {
  sendQuotation,
};
