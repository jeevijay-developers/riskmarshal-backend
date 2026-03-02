const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "in_discussion",
        "converted",
        "lost",
      ],
      default: "new",
    },
    source: {
      type: String,
      default: "Website",
    },
    notes: {
      type: String,
    },
    assignedIntermediaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    convertedClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null
    },
    activityLog: [
      {
        action: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", LeadSchema);
