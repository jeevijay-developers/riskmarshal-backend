// Using Twilio for SMS - can be replaced with other providers
const twilio = require("twilio");

const createTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }

  return twilio(accountSid, authToken);
};

const sendSMS = async (to, message) => {
  try {
    const client = createTwilioClient();
    const from = process.env.TWILIO_PHONE_NUMBER;

    const result = await client.messages.create({
      body: message,
      from: from,
      to: to,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    throw new Error(`SMS sending failed: ${error.message}`);
  }
};

const sendQuotationSMS = async (
  phoneNumber,
  policy,
  quotationUrl,
  paymentLink = null
) => {
  const message = `
Insurance Quotation
Quotation ID: ${policy.quotationId}
Premium: ₹${policy.premiumDetails?.finalPremium || "N/A"}
View: ${quotationUrl}
${paymentLink ? `Pay: ${paymentLink}` : ""}
  `.trim();

  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendQuotationSMS,
};
