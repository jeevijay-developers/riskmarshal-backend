const mongoose = require("mongoose");

const PolicyTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['Motor', 'Health', 'Life', 'Property', 'Travel', 'Other'],
    default: 'Motor'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  defaultFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model("PolicyType", PolicyTypeSchema);

