const mongoose = require("mongoose");

const RemittanceSchema = new mongoose.Schema({
  insurer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Insurer',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  policies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy'
  }],
  totalCommission: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'reconciled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  reconciliationDate: {
    type: Date
  },
  notes: {
    type: String
  },
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Compound index to ensure unique remittance per insurer per month/year
RemittanceSchema.index({ insurer: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Remittance", RemittanceSchema);

