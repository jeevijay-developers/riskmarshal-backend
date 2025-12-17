const mongoose = require("mongoose");

const PolicyTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    // High-level line of business (Motor / Non-Motor / Health / Life)
    category: {
      type: String,
      enum: ["Motor", "Non-Motor", "Health", "Life", "Other"],
      default: "Motor",
    },
    // Mid-level grouping (e.g., Package, Liability, Fire, Retail Health)
    subCategory: {
      type: String,
      trim: true,
    },
    // Leaf-level variant (e.g., TWP EV, TWP Non-EV, Term Plan)
    type: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    defaultFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PolicyType", PolicyTypeSchema);
