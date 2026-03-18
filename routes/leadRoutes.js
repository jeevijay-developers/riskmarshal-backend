const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  assignLead,
} = require("../controllers/leadController");
const { authorize } = require('../middleware/auth');

// All routes are protected
router.use(authenticate);

// Get all leads
router.get("/", getLeads);

// Get single lead
router.get("/:id", getLeadById);

// Create lead
router.post("/", createLead);

// Update lead
router.put("/:id", updateLead);

// Delete lead
router.delete("/:id", deleteLead);

// Convert lead
router.post("/:id/convert", convertLead);

// Assign lead to intermediary (admin only)
router.put("/:id/assign", authorize('admin'), assignLead);

module.exports = router;
