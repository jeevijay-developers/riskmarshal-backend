const InsurancePolicy = require("../models/InsurancePolicy");
const { generateQuotationPDF } = require("../utils/pdfGenerator");
const { generateQRCode } = require("../utils/qrGenerator");
const constants = require("../config/constants");

const generateQuotation = async (policyId) => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate("insurer")
      .populate("policyType")
      .populate("client")
      .populate("subagent");

    if (!policy) {
      throw new Error("Policy not found");
    }

    // Generate unique quotation ID if not exists
    if (!policy.quotationId) {
      policy.quotationId = `QT${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;
    }

    // Generate QR code
    const qrData = {
      policyId: policy._id,
      quotationId: policy.quotationId,
      client: policy.client?.name,
      premium: policy.premiumDetails?.finalPremium,
    };
    const qrFilename = `qr-${policy.quotationId}.png`;
    policy.qrCodeLink = await generateQRCode(qrData, qrFilename);

    // Generate quotation PDF
    const pdfUrl = await generateQuotationPDF(policy);
    policy.quotationPdfUrl = pdfUrl;
    if (policy.status === constants.POLICY_STATUS.DRAFT) {
      policy.status = constants.POLICY_STATUS.QUOTATION_SENT;
    }

    await policy.save();

    return {
      quotationId: policy.quotationId,
      pdfUrl: policy.quotationPdfUrl,
      qrCodeLink: policy.qrCodeLink,
      policy,
    };
  } catch (error) {
    throw new Error(`Quotation generation failed: ${error.message}`);
  }
};

module.exports = {
  generateQuotation,
};
