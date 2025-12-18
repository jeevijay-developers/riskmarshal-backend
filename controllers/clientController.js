const Client = require("../models/Client");

// Get all clients
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ createdBy: req.user._id })
      .populate("policies")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
    });
  }
};

// Get client by ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate("policies");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client",
    });
  }
};

// Create new client
exports.createClient = async (req, res) => {
  try {
    const { name, contactNumber, email, address, gstIn } = req.body;

    if (!name || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and contact number are required",
      });
    }

    // Check if client with same contact number already exists
    const existingClient = await Client.findOne({
      contactNumber,
      createdBy: req.user._id,
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "A client with this contact number already exists",
      });
    }

    const client = new Client({
      name,
      contactNumber,
      email,
      address,
      gstIn,
      createdBy: req.user._id,
    });

    await client.save();

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client,
    });
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create client",
    });
  }
};

// Update client
exports.updateClient = async (req, res) => {
  try {
    const { name, contactNumber, email, address, gstIn } = req.body;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { name, contactNumber, email, address, gstIn },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update client",
    });
  }
};

// Delete client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete client",
    });
  }
};

// Search clients
exports.searchClients = async (req, res) => {
  try {
    const { query } = req.query;

    const clients = await Client.find({
      createdBy: req.user._id,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { contactNumber: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { customerId: { $regex: query, $options: "i" } },
      ],
    }).populate("policies");

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Error searching clients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search clients",
    });
  }
};
