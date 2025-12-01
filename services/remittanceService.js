const Remittance = require('../models/Remittance');
const InsurancePolicy = require('../models/InsurancePolicy');
const Insurer = require('../models/Insurer');
const constants = require('../config/constants');

const createRemittance = async (insurerId, month, year) => {
  try {
    // Check if remittance already exists
    const existing = await Remittance.findOne({
      insurer: insurerId,
      month,
      year
    });

    if (existing) {
      throw new Error('Remittance for this month/year already exists');
    }

    // Find all policies for this insurer in the given month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const policies = await InsurancePolicy.find({
      insurer: insurerId,
      paymentStatus: constants.PAYMENT_STATUS.PAID,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Calculate total commission
    const totalCommission = policies.reduce((sum, policy) => {
      return sum + (policy.commission || 0);
    }, 0);

    // Create remittance record
    const remittance = await Remittance.create({
      insurer: insurerId,
      month,
      year,
      policies: policies.map(p => p._id),
      totalCommission,
      status: 'pending'
    });

    return remittance;
  } catch (error) {
    throw new Error(`Remittance creation failed: ${error.message}`);
  }
};

const reconcileRemittance = async (remittanceId, paidAmount, reconciledBy, notes = '') => {
  try {
    const remittance = await Remittance.findById(remittanceId);
    if (!remittance) {
      throw new Error('Remittance not found');
    }

    // Update remittance
    remittance.paidAmount = paidAmount;
    remittance.status = 'reconciled';
    remittance.reconciliationDate = new Date();
    remittance.reconciledBy = reconciledBy;
    remittance.notes = notes;

    await remittance.save();

    // Update all policies' commission status
    await InsurancePolicy.updateMany(
      { _id: { $in: remittance.policies } },
      {
        commissionStatus: constants.COMMISSION_STATUS.RECONCILED,
        remittanceDate: remittance.reconciliationDate
      }
    );

    return remittance;
  } catch (error) {
    throw new Error(`Remittance reconciliation failed: ${error.message}`);
  }
};

const markRemittanceAsPaid = async (remittanceId, paymentDate) => {
  try {
    const remittance = await Remittance.findById(remittanceId);
    if (!remittance) {
      throw new Error('Remittance not found');
    }

    remittance.status = 'paid';
    remittance.paymentDate = paymentDate || new Date();

    await remittance.save();

    // Update policies' commission status to paid
    await InsurancePolicy.updateMany(
      { _id: { $in: remittance.policies } },
      {
        commissionStatus: constants.COMMISSION_STATUS.PAID,
        remittanceDate: remittance.paymentDate
      }
    );

    return remittance;
  } catch (error) {
    throw new Error(`Remittance payment update failed: ${error.message}`);
  }
};

const getRemittances = async (filters = {}) => {
  try {
    const query = {};
    
    if (filters.insurer) {
      query.insurer = filters.insurer;
    }
    if (filters.month) {
      query.month = filters.month;
    }
    if (filters.year) {
      query.year = filters.year;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const remittances = await Remittance.find(query)
      .populate('insurer', 'companyName')
      .populate('policies')
      .populate('reconciledBy', 'username email')
      .sort({ year: -1, month: -1 });

    return remittances;
  } catch (error) {
    throw new Error(`Failed to fetch remittances: ${error.message}`);
  }
};

module.exports = {
  createRemittance,
  reconcileRemittance,
  markRemittanceAsPaid,
  getRemittances
};

