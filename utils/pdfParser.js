const pdfParse = require('pdf-parse');

const parsePDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

// Extract structured data from PDF text (basic implementation)
// This is a placeholder - in production, you'd use OCR or ML-based extraction
const extractPolicyData = (text) => {
  const extracted = {};

  // Basic regex patterns for common fields
  const patterns = {
    policyNumber: /policy\s*(?:no|number)[\s:]*([A-Z0-9\-]+)/i,
    registrationNumber: /(?:registration|reg\.?)\s*(?:no|number)[\s:]*([A-Z]{2}[-]?[0-9]{1,2}[-]?[A-Z]{1,2}[-]?[0-9]{4})/i,
    engineNumber: /engine\s*(?:no|number)[\s:]*([A-Z0-9]+)/i,
    chassisNumber: /chassis\s*(?:no|number)[\s:]*([A-Z0-9]+)/i,
    manufacturer: /(?:make|manufacturer)[\s:]*([A-Z\s]+)/i,
    model: /model[\s:]*([A-Z0-9\s\-]+)/i,
    premium: /(?:premium|total\s*premium)[\s:]*[₹]?\s*([0-9,]+\.?[0-9]*)/i,
    periodFrom: /(?:period\s*from|from\s*date)[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    periodTo: /(?:period\s*to|to\s*date)[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      extracted[key] = match[1].trim();
    }
  }

  return extracted;
};

module.exports = {
  parsePDF,
  extractPolicyData
};

