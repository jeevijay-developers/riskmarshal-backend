const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'agent', 'subagent'],
    required: true
  },
  subagent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subagent',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Profile fields
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Notification preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    renewalReminders: { type: Boolean, default: true },
    claimsAlerts: { type: Boolean, default: false },
    newClients: { type: Boolean, default: true }
  },
  // Organization settings (for admin users)
  organization: {
    companyName: { type: String, default: '' },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    apiConfig: {
      whatsappApiKey: { type: String, default: '', select: false },
      whatsappPhoneId: { type: String, default: '' },
      emailSmtpHost: { type: String, default: '' },
      emailSmtpPort: { type: Number, default: 587 },
      emailSmtpUser: { type: String, default: '' },
      emailSmtpPass: { type: String, default: '', select: false }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);

