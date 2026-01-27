// Official WhatsApp Business API
const axios = require("axios");

const WHATSAPP_API_VERSION = "v22.0";
const WHATSAPP_API_BASE_URL = "https://graph.facebook.com";

/**
 * Send a template message via WhatsApp Business API
 * @param {string} to - Recipient phone number (with country code, no + or spaces)
 * @param {string} templateName - Name of the approved template
 * @param {string} languageCode - Language code (e.g., "en_US")
 * @param {Array} components - Template components with parameters
 */
const sendTemplateMessage = async (
  to,
  templateName,
  languageCode = "en_US",
  components = []
) => {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      throw new Error("WhatsApp Business API credentials not configured");
    }

    // Clean phone number - remove +, spaces, dashes
    const cleanPhone = to.replace(/[\s\-\+]/g, "");

    const payload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    // Add components if provided
    if (components && components.length > 0) {
      payload.template.components = components;
    }

    const response = await axios({
      url: `${WHATSAPP_API_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      method: "post",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify(payload),
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`WhatsApp template message failed: ${errorMessage}`);
  }
};

/**
 * Send a text message via WhatsApp Business API
 * Note: Text messages can only be sent within 24-hour customer service window
 * @param {string} to - Recipient phone number
 * @param {string} message - Text message body
 */
const sendTextMessage = async (to, message) => {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      throw new Error("WhatsApp Business API credentials not configured");
    }

    // Clean phone number
    const cleanPhone = to.replace(/[\s\-\+]/g, "");

    const response = await axios({
      url: `${WHATSAPP_API_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      method: "post",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: {
          body: message,
        },
      }),
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    throw new Error(`WhatsApp text message failed: ${errorMessage}`);
  }
};

/**
 * Send renewal reminder via WhatsApp template
 * @param {string} phoneNumber - Recipient phone number
 * @param {object} renewalData - Renewal information
 */
const sendRenewalReminder = async (phoneNumber, renewalData) => {
  // Use a template for renewal reminders (you'll need to create this template in Meta Business Manager)
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: renewalData.clientName || "Valued Customer" },
        { type: "text", text: renewalData.policyType || "Insurance" },
        { type: "text", text: renewalData.expiryDate || "N/A" },
        { type: "text", text: renewalData.premium || "N/A" },
      ],
    },
  ];

  // Using hello_world as fallback template, replace with your actual renewal template
  const templateName = process.env.WHATSAPP_RENEWAL_TEMPLATE || "hello_world";

  return sendTemplateMessage(phoneNumber, templateName, "en_US", components);
};

/**
 * Send quotation via WhatsApp template
 * @param {string} phoneNumber - Recipient phone number
 * @param {object} policy - Policy object
 * @param {string} quotationUrl - URL to quotation PDF
 * @param {string} paymentLink - Payment link (optional)
 */
const sendQuotationWhatsApp = async (
  phoneNumber,
  policy,
  quotationUrl,
  paymentLink = null
) => {
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: policy.quotationId || "N/A" },
        {
          type: "text",
          text: `₹${policy.premiumDetails?.finalPremium || "N/A"}`,
        },
      ],
    },
  ];

  // Using hello_world as fallback, replace with your actual quotation template
  const templateName = process.env.WHATSAPP_QUOTATION_TEMPLATE || "hello_world";

  return sendTemplateMessage(phoneNumber, templateName, "en_US", components);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use sendTemplateMessage or sendTextMessage instead
 */
const sendWhatsApp = async (to, message, mediaUrl = null) => {
  // For utility messages outside 24-hour window, we need to use templates
  // This is a simple wrapper that attempts text message first
  console.warn(
    "sendWhatsApp is deprecated. Use sendTemplateMessage for utility messages."
  );
  return sendTextMessage(to, message);
};

module.exports = {
  sendTemplateMessage,
  sendTextMessage,
  sendRenewalReminder,
  sendQuotationWhatsApp,
  sendWhatsApp, // Deprecated but kept for backward compatibility
};
