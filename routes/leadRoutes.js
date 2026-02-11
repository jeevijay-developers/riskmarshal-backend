const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} = require("../controllers/leadController");

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

module.exports = router;
