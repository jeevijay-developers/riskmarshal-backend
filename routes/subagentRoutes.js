const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getSubagents,
  createSubagent,
  updateSubagent,
  deleteSubagent,
} = require("../controllers/subagentController");

router.use(authenticate);

router.get("/", getSubagents);
router.post("/", createSubagent);
router.put("/:id", updateSubagent);
router.delete("/:id", deleteSubagent);

module.exports = router;
