const mongoose = require("mongoose");

const InsurerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  productTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyType'
  }],
  contactDetails: {
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    helpline: { type: String }
  },
  commissionRates: [{
    policyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyType'
    },
    rate: { type: Number }, // percentage
    fixedAmount: { type: Number } // if fixed amount instead of percentage
  }],
  remittanceDetails: {
    bankAccount: { type: String },
    bankName: { type: String },
    ifscCode: { type: String },
    paymentTerms: { type: String } // e.g., "Monthly", "Quarterly"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  branchDetails: {
    address: { type: String },
    helpline: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model("Insurer", InsurerSchema);

