require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const path = require("path");
const fs = require("fs");

// Import routes
const authRoutes = require("./routes/authRoutes");
const policyRoutes = require("./routes/policyRoutes");
const subagentRoutes = require("./routes/subagentRoutes");
const insurerRoutes = require("./routes/insurerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const remittanceRoutes = require("./routes/remittanceRoutes");
const clientRoutes = require("./routes/clientRoutes");
const reportRoutes = require("./routes/reportRoutes");
const renewalRoutes = require("./routes/renewalRoutes");

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Create necessary directories
const uploadsDir = path.join(__dirname, "uploads");
const storageDir = path.join(__dirname, "storage", "pdfs");
const quotationsDir = path.join(storageDir, "quotations");
const policiesDir = path.join(storageDir, "policies");

[uploadsDir, storageDir, quotationsDir, policiesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static files
app.use("/uploads", express.static(uploadsDir));
app.use("/storage", express.static(path.join(__dirname, "storage")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/subagents", subagentRoutes);
app.use("/api/insurers", insurerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/remittances", remittanceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/renewals", renewalRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
