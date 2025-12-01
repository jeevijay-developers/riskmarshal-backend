const mongoose = require("mongoose");

const SubagentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  contact: {
    type: String
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String
  },
  commissionRate: {
    type: Number,
    default: null // null means use insurer's default rate
  },
  isActive: {
    type: Boolean,
    default: true
  },
  policies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy'
  }]
}, { timestamps: true });

module.exports = mongoose.model("Subagent", SubagentSchema);

