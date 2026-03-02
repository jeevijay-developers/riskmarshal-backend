const Lead = require("../models/Lead");

// Get all leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

// Get lead by ID
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
    });
  }
};

// Create new lead
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, status, source, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    const lead = new Lead({
      name,
      email,
      phone,
      status,
      source,
      notes,
      createdBy: req.user._id,
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create lead",
    });
  }
};

// Update lead
exports.updateLead = async (req, res) => {
  try {
    const { name, email, phone, status, source, notes } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { name, email, phone, status, source, notes },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead",
    });
  }
};

// Delete lead
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lead",
    });
  }
};

// Convert lead to client
exports.convertLead = async (req, res) => {
  try {
    const Lead = require("../models/Lead");
    const Client = require("../models/Client");
    
    const lead = await Lead.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (lead.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Lead is already converted",
      });
    }

    const client = new Client({
      name: lead.name,
      email: lead.email,
      contactNumber: lead.phone,
      convertedFromLead: lead._id,
      createdBy: req.user._id,
    });
    
    await client.save();

    lead.status = "converted";
    lead.convertedClientId = client._id;
    lead.activityLog = lead.activityLog || [];
    lead.activityLog.push({
      action: "Converted to Client",
      performedBy: req.user._id,
      notes: "Lead successfully converted to an active client.",
    });

    await lead.save();

    res.json({
      success: true,
      message: "Lead converted to client successfully",
      data: { lead, client },
    });
  } catch (error) {
    console.error("Error converting lead:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to convert lead",
    });
  }
};
