const nodemailer = require("nodemailer");

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async (to, subject, text, html = null, attachments = []) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html || text,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

const sendQuotationEmail = async (
  recipient,
  policy,
  quotationUrl,
  paymentLink = null
) => {
  const subject = `Insurance Quotation - ${policy.quotationId}`;
  const text = `
Dear ${policy.client?.name || "Customer"},

Please find attached your insurance quotation.

Quotation ID: ${policy.quotationId}
Premium Amount: ₹${policy.premiumDetails?.finalPremium || "N/A"}

You can view and download the quotation from the link below:
${quotationUrl}

${
  paymentLink
    ? `To proceed with payment, use the following link:
${paymentLink}
`
    : ""
}

Thank you for choosing our services.

Best regards,
Insurance Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Insurance Quotation</h2>
      <p>Dear ${policy.client?.name || "Customer"},</p>
      <p>Please find attached your insurance quotation.</p>
      <p><strong>Quotation ID:</strong> ${policy.quotationId}</p>
      <p><strong>Premium Amount:</strong> ₹${
        policy.premiumDetails?.finalPremium || "N/A"
      }</p>
      <p><a href="${quotationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Quotation</a></p>
      ${
        paymentLink
          ? `<p><a href="${paymentLink}" style="background-color: #1D4ED8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>`
          : ""
      }
      <p>Thank you for choosing our services.</p>
      <p>Best regards,<br>Insurance Team</p>
    </div>
  `;

  return sendEmail(recipient, subject, text, html);
};

module.exports = {
  sendEmail,
  sendQuotationEmail,
};
