const Subagent = require("../models/Subagent");

// GET /api/subagents
const getSubagents = async (_req, res) => {
  try {
    const subagents = await Subagent.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: subagents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subagents
const createSubagent = async (req, res) => {
  try {
    const subagent = await Subagent.create(req.body);
    res.status(201).json({ success: true, data: subagent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/subagents/:id
const updateSubagent = async (req, res) => {
  try {
    const subagent = await Subagent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!subagent) {
      return res.status(404).json({ success: false, message: "Subagent not found" });
    }
    res.status(200).json({ success: true, data: subagent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/subagents/:id
const deleteSubagent = async (req, res) => {
  try {
    const subagent = await Subagent.findById(req.params.id);
    if (!subagent) {
      return res.status(404).json({ success: false, message: "Subagent not found" });
    }
    await subagent.deleteOne();
    res.status(200).json({ success: true, message: "Subagent deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSubagents,
  createSubagent,
  updateSubagent,
  deleteSubagent,
};
