const Insurer = require("../models/Insurer");
const User = require("../models/User");

// GET /api/insurers
const listInsurers = async (_req, res) => {
  try {
    const insurers = await Insurer.find().populate("productTypes").sort({ companyName: 1 });
    res.status(200).json({ success: true, data: insurers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/insurers
const createInsurer = async (req, res) => {
  try {
    const insurer = await Insurer.create(req.body);
    res.status(201).json({ success: true, data: insurer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/insurers/:id
const updateInsurer = async (req, res) => {
  try {
    const insurer = await Insurer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!insurer) {
      return res.status(404).json({ success: false, message: "Insurer not found" });
    }
    res.status(200).json({ success: true, data: insurer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/insurers/:id
const deleteInsurer = async (req, res) => {
  try {
    const insurer = await Insurer.findById(req.params.id);
    if (!insurer) {
      return res.status(404).json({ success: false, message: "Insurer not found" });
    }
    await insurer.deleteOne();
    res.status(200).json({ success: true, message: "Insurer deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/insurers/:id/associate  — link an intermediary (agent) to this insurer
const associateIntermediary = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const insurer = await Insurer.findById(req.params.id);
    if (!insurer) {
      return res.status(404).json({ success: false, message: 'Insurer not found' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'agent') {
      return res.status(404).json({ success: false, message: 'Agent user not found' });
    }

    // Add to insurer's list (avoid duplicates)
    if (!insurer.associatedIntermediaries.map(String).includes(String(userId))) {
      insurer.associatedIntermediaries.push(userId);
      await insurer.save();
    }

    await insurer.populate('associatedIntermediaries', 'username firstName lastName email');
    res.status(200).json({ success: true, data: insurer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/insurers/:id/disassociate  — remove intermediary link
const disassociateIntermediary = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const insurer = await Insurer.findById(req.params.id);
    if (!insurer) {
      return res.status(404).json({ success: false, message: 'Insurer not found' });
    }

    insurer.associatedIntermediaries = insurer.associatedIntermediaries.filter(
      id => String(id) !== String(userId)
    );
    await insurer.save();

    await insurer.populate('associatedIntermediaries', 'username firstName lastName email');
    res.status(200).json({ success: true, data: insurer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listInsurers,
  createInsurer,
  updateInsurer,
  deleteInsurer,
  associateIntermediary,
  disassociateIntermediary,
};
