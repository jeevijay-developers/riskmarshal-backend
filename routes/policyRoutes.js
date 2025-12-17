const express = require("express");
const router = express.Router();
const {
  getPolicyTypes,
  getInsurers,
  getInsurerPolicyTypes,
  createPolicyController,
  getAllPolicies,
  getSinglePolicy,
  updatePolicyController,
  deletePolicyController,
  calculatePremium,
  getPremiumBreakdown,
  generateQuotationController,
  sendQuotationController,
  generatePolicyController,
  approvePaymentController,
} = require("../controllers/policyController");
const {
  uploadPDF,
  triggerOCRExtraction,
  getOCRData,
  updateOCRDataController,
} = require("../controllers/ocrController");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

// All routes require authentication
router.use(authenticate);

// Policy type and insurer routes
router.get("/policy-types", getPolicyTypes);
router.get("/insurers", getInsurers);
router.get("/insurers/:id/policy-types", getInsurerPolicyTypes);

// OCR routes
router.post("/upload", upload.single("pdf"), uploadPDF);
router.post("/:id/ocr-extract", triggerOCRExtraction);
router.get("/:id/ocr-data", getOCRData);
router.put("/:id/ocr-data", updateOCRDataController);

// Policy CRUD routes
router.post("/", createPolicyController);
router.get("/", getAllPolicies);
router.get("/:id", getSinglePolicy);
router.put("/:id", updatePolicyController);
router.delete("/:id", deletePolicyController);
router.post("/:id/approve-payment", approvePaymentController);

// Calculation routes
router.post("/:id/calculate", calculatePremium);
router.get("/:id/premium-breakdown", getPremiumBreakdown);

// Quotation routes
router.post("/:id/generate-quotation", generateQuotationController);
router.post("/:id/send-quotation", sendQuotationController);

// Policy generation routes
router.post("/:id/generate-policy", generatePolicyController);

// Payment routes (moved here to keep policy-related routes together)
const {
  createPayment,
  getPaymentStatusController,
} = require("../controllers/paymentController");
router.post("/:id/create-payment", createPayment);
router.get("/:id/payment-status", getPaymentStatusController);

module.exports = router;
