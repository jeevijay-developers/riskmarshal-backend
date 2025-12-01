const mongoose = require("mongoose");

const InsuranceSchema = new mongoose.Schema({});

module.exports = mongoose.model("Insurance", InsuranceSchema);
