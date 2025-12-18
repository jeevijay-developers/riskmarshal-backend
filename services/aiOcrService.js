const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = "gemini-2.5-flash"; // free-tier friendly
const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

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

  const client = new GoogleGenAI({ apiKey });
  const base64Data = buffer.toString("base64");

  let result;
  try {
    result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt() },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });
  } catch (err) {
    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const detail = err.response?.data?.error?.message || err.message;
    throw new Error(
      `Gemini request failed${
        status ? ` (${status}${statusText ? ` ${statusText}` : ""})` : ""
      }: ${detail}`
    );
  }

  const text =
    result?.text ||
    result?.response?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join(" ");
  const parsed = parseJsonFromModel(text);

  return {
    model: GEMINI_MODEL,
    raw: text,
    parsed,
  };
};

module.exports = {
  extractWithGemini,
};
