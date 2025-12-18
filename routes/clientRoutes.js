const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
} = require("../controllers/clientController");

// All routes are protected
router.use(authenticate);

// Get all clients
router.get("/", getClients);

// Search clients
router.get("/search", searchClients);

// Get single client
router.get("/:id", getClientById);

// Create client
router.post("/", createClient);

// Update client
router.put("/:id", updateClient);

// Delete client
router.delete("/:id", deleteClient);

module.exports = router;
