const { parsePDF, extractPolicyData } = require("../utils/pdfParser");
const { extractWithGemini } = require("./aiOcrService");
const InsurancePolicy = require("../models/InsurancePolicy");

// Hybrid OCR: Gemini Vision (if configured) else PDF text parse fallback
const extractDataFromPDF = async (
  buffer,
  mimeType = "application/pdf",
  policyId = null
) => {
  try {
    let rawText = null;
    let numPages = null;
    let extractedFields = {};
    let ai = null;

    // Attempt AI extraction when key is present
    if (process.env.GEMINI_API_KEY) {
      const aiResult = await extractWithGemini(buffer, mimeType);
      ai = aiResult;
      if (aiResult?.parsed) {
        extractedFields = aiResult.parsed;
      }
    }

    // Fallback/basic text extraction for PDFs to store raw text
    if (mimeType === "application/pdf") {
      const pdfData = await parsePDF(buffer);
      rawText = pdfData.text;
      numPages = pdfData.numPages;
      // If AI didn't parse fields, try regex fallback
      if (!Object.keys(extractedFields || {}).length) {
        extractedFields = extractPolicyData(pdfData.text);
      }
    }

    const payload = {
      rawText,
      extractedFields,
      numPages,
      ai,
    };

    if (policyId) {
      await InsurancePolicy.findByIdAndUpdate(policyId, {
        ocrExtractedData: payload,
        ocrStatus: "extracted",
      });
    }

    return payload;
  } catch (error) {
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
};

// Update OCR extracted data after user review
const updateOCRData = async (policyId, correctedData) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    // Merge corrected data with existing OCR data
    const updatedOCRData = {
      ...policy.ocrExtractedData,
      correctedFields: correctedData,
      reviewedAt: new Date(),
    };

    policy.ocrExtractedData = updatedOCRData;
    policy.ocrStatus = "reviewed";
    await policy.save();

    return policy;
  } catch (error) {
    throw new Error(`OCR data update failed: ${error.message}`);
  }
};

module.exports = {
  extractDataFromPDF,
  updateOCRData,
};
