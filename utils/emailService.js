const { Resend } = require('resend');
const fs = require("fs");
const path = require("path");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html = null, attachments = []) => {
  try {
    // If no API key configured, return dummy success in dev
    if (!process.env.RESEND_API_KEY) {
       console.log("Resend API key missing. Skipping email send.");
       return { success: true, messageId: "dummy" };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || "Risk Marshal <onboarding@resend.dev>",
      to: typeof to === 'string' ? [to] : to,
      subject,
      text,
      html: html || text,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => {
        return {
          filename: att.filename,
          content: fs.readFileSync(att.path)
        };
      });
    }

    const data = await resend.emails.send(mailOptions);
    
    // In new Resend SDK, if error it's attached to data.error
    if (data.error) {
       throw new Error(data.error.message);
    }

    return {
      success: true,
      messageId: data.data?.id || 'unknown',
    };
  } catch (error) {
    console.error("Email error details:", error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(Number(value))) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const sendQuotationEmail = async (
  recipient,
  policy,
  quotationUrl,
  paymentLink = null
) => {
  const subject = `Insurance Quotation - ${policy.quotationId}`;
  const clientName = policy.client?.name || "Customer";
  const premium = formatCurrency(policy.premiumDetails?.finalPremium);
  const insurerName = policy.insurer?.companyName || "N/A";
  const policyTypeName = policy.policyType?.name || "Insurance Policy";
  
  const text = `
Dear ${clientName},

Please find attached your insurance quotation.

Quotation ID: ${policy.quotationId}
Premium Amount: ${premium}
Insurer: ${insurerName}

You can view and download the quotation from the link below:
${quotationUrl}

${paymentLink ? `To proceed with payment, use the following link:\n${paymentLink}\n` : ""}

Thank you for choosing our services.

Best regards,
Risk Marshal Insurance Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ab792e 0%, #8d6325 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Insurance Quotation</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Your personalized quote is ready</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${clientName}</strong>,
              </p>
              <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                Thank you for your interest in our insurance services. Please find attached your personalized quotation with all the details.
              </p>
              
              <!-- Quotation Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #e9ecef;">
                          <p style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Quotation ID</p>
                          <p style="color: #333333; font-size: 18px; font-weight: 600; margin: 5px 0 0;">${policy.quotationId}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="50%">
                                <p style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Insurer</p>
                                <p style="color: #333333; font-size: 14px; font-weight: 500; margin: 5px 0 0;">${insurerName}</p>
                              </td>
                              <td width="50%">
                                <p style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Policy Type</p>
                                <p style="color: #333333; font-size: 14px; font-weight: 500; margin: 5px 0 0;">${policyTypeName}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                          <p style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Total Premium</p>
                          <p style="color: #ab792e; font-size: 28px; font-weight: 700; margin: 5px 0 0;">${premium}</p>
                          <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0;">Inclusive of GST</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${quotationUrl}" style="display: inline-block; background-color: #6c757d; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 0 8px 10px;">
                      📄 Download Quotation
                    </a>
                    ${paymentLink ? `
                    <a href="${paymentLink}" style="display: inline-block; background-color: #ab792e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 0 8px 10px;">
                      💳 Proceed to Payment
                    </a>
                    ` : ""}
                  </td>
                </tr>
              </table>
              
              <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
                <strong>📎 Attachment:</strong> A detailed PDF quotation is attached to this email for your reference.
              </p>
              
              <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                If you have any questions or need assistance, please don't hesitate to contact us.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e9ecef;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0 0 5px;">Risk Marshal</p>
                    <p style="color: #6c757d; font-size: 13px; margin: 0;">Your Trusted Insurance Partner</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <p style="color: #999999; font-size: 11px; margin: 0; line-height: 1.5;">
                      This email contains confidential information intended solely for the addressee. If you received this email in error, please delete it and notify us immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Prepare PDF attachment if available
  const attachments = [];
  if (policy.quotationPdfUrl) {
    const pdfPath = path.join(__dirname, "..", policy.quotationPdfUrl);
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `Quotation-${policy.quotationId}.pdf`,
        path: pdfPath,
        contentType: "application/pdf",
      });
    }
  }

  return sendEmail(recipient, subject, text, html, attachments);
};

module.exports = {
  sendEmail,
  sendQuotationEmail,
};
