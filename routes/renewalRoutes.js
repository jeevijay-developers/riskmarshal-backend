const express = require("express");
const router = express.Router();
const {
  getAllRenewalsController,
  getRenewalByIdController,
  updateRenewalController,
  sendReminderController,
  sendBulkReminderController,
  getRenewalStatsController,
  getPoliciesDueController,
  getOverduePoliciesController,
  processRenewalController,
} = require("../controllers/renewalController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Statistics route (must be before /:id routes)
router.get("/stats", getRenewalStatsController);

// Overdue policies
router.get("/overdue", getOverduePoliciesController);

// Policies due in X days
router.get("/due/:days", getPoliciesDueController);

// Bulk reminder
router.post("/bulk-reminder", sendBulkReminderController);

// Get all renewals with optional filters
router.get("/", getAllRenewalsController);

// Get single renewal
router.get("/:id", getRenewalByIdController);

// Update renewal status/notes
router.put("/:id", updateRenewalController);

// Send reminder to client
router.post("/:id/send-reminder", sendReminderController);

// Process renewal (roll dates, mark renewed)
router.put("/:id/process", processRenewalController);

module.exports = router;
