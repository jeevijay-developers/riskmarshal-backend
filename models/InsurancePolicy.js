const mongoose = require("mongoose");

const InsurancePolicySchema = new mongoose.Schema(
  {
    insurer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insurer",
      required: true,
    },
    policyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PolicyType",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    subagent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subagent",
    },
    vehicleDetails: {
      manufacturer: { type: String },
      model: { type: String },
      variant: { type: String },
      registrationNumber: { type: String },
      engineNumber: { type: String },
      chassisNumber: { type: String },
      fuelType: { type: String },
      seatingCapacity: { type: Number },
      cubicCapacity: { type: Number },
      bodyType: { type: String },
      odometerReading: { type: Number },
    },
    policyDetails: {
      policyNumber: { type: String },
      periodFrom: { type: Date },
      periodTo: { type: Date },
      insuranceStartDate: { type: Date },
      insuranceEndDate: { type: Date },
      invoiceNumber: { type: String },
      invoiceDate: { type: Date },
      customerId: { type: String },
      gstIn: { type: String },
      paymentDetails: {
        mode: { type: String }, // Cheque / Online / Cash
        chequeNumber: { type: String },
        bankName: { type: String },
      },
      previousPolicy: {
        insurer: { type: String },
        policyNumber: { type: String },
        validFrom: { type: Date },
        validTo: { type: Date },
      },
    },
    premiumDetails: {
      ownDamage: {
        basicOD: { type: Number },
        addOnZeroDep: { type: Number },
        addOnConsumables: { type: Number },
        others: { type: Number },
        total: { type: Number },
      },
      liability: {
        basicTP: { type: Number },
        paCoverOwnerDriver: { type: Number },
        llForPaidDriver: { type: Number },
        llEmployees: { type: Number },
        otherLiability: { type: Number },
        total: { type: Number },
      },
      netPremium: { type: Number },
      gst: { type: Number },
      finalPremium: { type: Number },
      compulsoryDeductible: { type: Number },
      voluntaryDeductible: { type: Number },
      ncb: { type: Number }, // No Claim Bonus %
      breakdown: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    additionalNotes: {
      limitationsLiability: { type: String },
      termsConditions: { type: String },
    },
    agentDetails: {
      name: { type: String },
      code: { type: String },
      contact: { type: String },
    },
    branchDetails: {
      address: { type: String },
      helpline: { type: String },
    },
    qrCodeLink: { type: String },
    status: {
      type: String,
      enum: [
        "draft",
        "quotation_sent",
        "payment_pending",
        "payment_approved",
        "active",
        "expired",
        "cancelled",
      ],
      default: "draft",
    },
    quotationId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentLink: {
      type: String,
    },
    paymentApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paymentApprovedAt: {
      type: Date,
    },
    commission: {
      type: Number,
      default: 0,
    },
    commissionStatus: {
      type: String,
      enum: ["pending", "paid", "reconciled"],
      default: "pending",
    },
    remittanceDate: {
      type: Date,
    },
    ocrExtractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ocrStatus: {
      type: String,
      enum: ["pending", "extracted", "reviewed", "corrected"],
      default: "pending",
    },
    quotationPdfUrl: {
      type: String,
    },
    policyPdfUrl: {
      type: String,
    },
    renewalTracking: {
      status: {
        type: String,
        enum: ["not_contacted", "contacted", "pending", "overdue", "renewed"],
        default: "not_contacted",
      },
      notes: { type: String },
      lastContacted: { type: Date },
      lastUpdated: { type: Date },
      contactHistory: [
        {
          date: { type: Date },
          channels: [{ type: String }],
          subject: { type: String },
          message: { type: String },
          results: { type: mongoose.Schema.Types.Mixed },
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InsurancePolicy", InsurancePolicySchema);
