const { parsePDF, extractPolicyData } = require('../utils/pdfParser');
const InsurancePolicy = require('../models/InsurancePolicy');

// This is a basic OCR service using PDF text extraction
// For production, integrate with external OCR APIs like Google Vision, AWS Textract, etc.
const extractDataFromPDF = async (buffer, policyId = null) => {
  try {
    // Parse PDF to get text
    const pdfData = await parsePDF(buffer);
    
    // Extract structured data from text
    const extractedData = extractPolicyData(pdfData.text);

    // If policyId is provided, update the policy with OCR data
    if (policyId) {
      await InsurancePolicy.findByIdAndUpdate(policyId, {
        ocrExtractedData: {
          rawText: pdfData.text,
          extractedFields: extractedData,
          numPages: pdfData.numPages
        },
        ocrStatus: 'extracted'
      });
    }

    return {
      rawText: pdfData.text,
      extractedFields: extractedData,
      numPages: pdfData.numPages
    };
  } catch (error) {
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
};

// Update OCR extracted data after user review
const updateOCRData = async (policyId, correctedData) => {
  try {
    const policy = await InsurancePolicy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Merge corrected data with existing OCR data
    const updatedOCRData = {
      ...policy.ocrExtractedData,
      correctedFields: correctedData,
      reviewedAt: new Date()
    };

    policy.ocrExtractedData = updatedOCRData;
    policy.ocrStatus = 'reviewed';
    await policy.save();

    return policy;
  } catch (error) {
    throw new Error(`OCR data update failed: ${error.message}`);
  }
};

module.exports = {
  extractDataFromPDF,
  updateOCRData
};

