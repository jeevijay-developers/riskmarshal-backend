const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getReports,
  getReportById,
  generateReport,
  deleteReport,
  downloadReport,
} = require("../controllers/reportController");

// All routes are protected
router.use(authenticate);

// Get all reports
router.get("/", getReports);

// Generate new report
router.post("/generate", generateReport);

// Get single report
router.get("/:id", getReportById);

// Download report
router.get("/:id/download", downloadReport);

// Delete report
router.delete("/:id", deleteReport);

module.exports = router;
