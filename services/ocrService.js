const { extractWithGemini } = require("./aiOcrService");
const InsurancePolicy = require("../models/InsurancePolicy");

// AI-only OCR: rely solely on Gemini; if AI fails, surface the error and do not fallback
const extractDataFromPDF = async (
  buffer,
  mimeType = "application/pdf",
  policyId = null
) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI OCR is not configured (GEMINI_API_KEY missing)");
    }

    const aiResult = await extractWithGemini(buffer, mimeType);
    const extractedFields = aiResult?.parsed || {};

    if (!Object.keys(extractedFields).length) {
      throw new Error("AI OCR returned no fields");
    }

    const payload = {
      rawText: null,
      extractedFields,
      numPages: null,
      ai: aiResult,
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
