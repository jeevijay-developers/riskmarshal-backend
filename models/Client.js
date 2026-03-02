const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    gstIn: {
      type: String,
      trim: true,
    },
    customerId: {
      type: String,
      unique: true,
    },
    policies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InsurancePolicy",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Generate customerId before saving; uses max existing value to avoid duplicates after deletions
ClientSchema.pre("save", async function () {
  if (this.customerId) return;

  const lastClient = await mongoose
    .model("Client")
    .findOne({}, { customerId: 1 })
    .sort({ customerId: -1 })
    .lean();

  let nextNumber = 1;
  if (lastClient?.customerId) {
    const parsed = parseInt(lastClient.customerId.replace(/\D/g, ""), 10);
    if (!Number.isNaN(parsed)) nextNumber = parsed + 1;
  }

  this.customerId = `CUST${String(nextNumber).padStart(6, "0")}`;
});

module.exports = mongoose.model("Client", ClientSchema);
