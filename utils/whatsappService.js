// Using Twilio WhatsApp API
const twilio = require('twilio');

const createTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  
  return twilio(accountSid, authToken);
};

const sendWhatsApp = async (to, message, mediaUrl = null) => {
  try {
    const client = createTwilioClient();
    const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    const messageData = {
      from: from,
      to: toNumber,
      body: message
    };
    
    if (mediaUrl) {
      messageData.mediaUrl = [mediaUrl];
    }
    
    const result = await client.messages.create(messageData);
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    throw new Error(`WhatsApp sending failed: ${error.message}`);
  }
};

const sendQuotationWhatsApp = async (phoneNumber, policy, quotationUrl) => {
  const message = `
*Insurance Quotation*

Quotation ID: ${policy.quotationId}
Premium Amount: ₹${policy.premiumDetails?.finalPremium || 'N/A'}

View your quotation: ${quotationUrl}

Thank you for choosing our services.
  `.trim();
  
  return sendWhatsApp(phoneNumber, message);
};

module.exports = {
  sendWhatsApp,
  sendQuotationWhatsApp
};

