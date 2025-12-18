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

// Generate customerId before saving
ClientSchema.pre("save", async function () {
  if (!this.customerId) {
    const count = await mongoose.model("Client").countDocuments();
    this.customerId = `CUST${String(count + 1).padStart(6, "0")}`;
  }
});

module.exports = mongoose.model("Client", ClientSchema);
