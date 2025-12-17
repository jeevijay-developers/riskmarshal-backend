const axios = require("axios");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const buildPrompt =
  () => `Extract insurance policy data. Return ONLY a compact JSON matching this shape:
{
  "policyNumber": string,
  "insurerName": string,
  "customer": {
    "name": string,
    "address": string,
    "email": string,
    "phone": string,
    "gstIn": string,
    "customerId": string
  },
  "vehicle": {
    "manufacturer": string,
    "model": string,
    "variant": string,
    "registrationNumber": string,
    "chassisNumber": string,
    "engineNumber": string,
    "fuelType": string,
    "bodyType": string,
    "cubicCapacity": number,
    "seatingCapacity": number,
    "odometerReading": number,
    "idv": number
  },
  "policy": {
    "periodFrom": string,
    "periodTo": string,
    "issueDate": string,
    "invoiceNumber": string,
    "invoiceDate": string
  },
  "premium": {
    "ownDamage": {
      "basicOD": number,
      "ncbPercent": number,
      "ncbDiscount": number,
      "netOD": number,
      "addOnZeroDep": number,
      "addOnConsumables": number,
      "others": number,
      "total": number
    },
    "liability": {
      "basicTP": number,
      "paCoverOwnerDriver": number,
      "llForPaidDriver": number,
      "llEmployees": number,
      "otherLiability": number,
      "total": number
    },
    "packagePremium": number,
    "gstRate": number,
    "gst": number,
    "gstSplit": { "cgst": number, "sgst": number },
    "finalPremium": number,
    "compulsoryDeductible": number,
    "voluntaryDeductible": number
  }
}
Rules:
- Always return valid JSON only.
- Numbers as numbers (no commas, no currency symbols).
- Dates in ISO or dd/mm/yyyy format.
- If data missing, use null.
- Do not include explanations.`;

const parseJsonFromModel = (text) => {
  if (!text) return null;
  // Try to find JSON block
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    return null;
  }
};

const extractWithGemini = async (buffer, mimeType) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const base64Data = buffer.toString("base64");
  const payload = {
    contents: [
      {
        parts: [
          { text: buildPrompt() },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const response = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  const candidate = response.data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join(" ");
  const parsed = parseJsonFromModel(text);

  return {
    model: "gemini-1.5-pro",
    raw: text,
    parsed,
  };
};

module.exports = {
  extractWithGemini,
};
