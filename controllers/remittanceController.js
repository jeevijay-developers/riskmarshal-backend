const {
  createRemittance,
  reconcileRemittance,
  markRemittanceAsPaid,
  getRemittances
} = require('../services/remittanceService');

// @desc    Get all remittances
// @route   GET /api/remittances
// @access  Private (Admin/Finance)
const getAllRemittances = async (req, res) => {
  try {
    const filters = {
      insurer: req.query.insurer,
      month: req.query.month ? parseInt(req.query.month) : null,
      year: req.query.year ? parseInt(req.query.year) : null,
      status: req.query.status
    };

    const remittances = await getRemittances(filters);

    res.status(200).json({
      success: true,
      count: remittances.length,
      data: remittances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create remittance record
// @route   POST /api/remittances
// @access  Private (Admin/Finance)
const createRemittanceController = async (req, res) => {
  try {
    const { insurerId, month, year } = req.body;

    if (!insurerId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide insurerId, month, and year'
      });
    }

    const remittance = await createRemittance(insurerId, month, year);

    res.status(201).json({
      success: true,
      data: remittance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reconcile remittance
// @route   PUT /api/remittances/:id/reconcile
// @access  Private (Admin/Finance)
const reconcileRemittanceController = async (req, res) => {
  try {
    const { paidAmount, notes } = req.body;
    const remittanceId = req.params.id;

    if (!paidAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide paidAmount'
      });
    }

    const remittance = await reconcileRemittance(
      remittanceId,
      paidAmount,
      req.user._id,
      notes
    );

    res.status(200).json({
      success: true,
      data: remittance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark remittance as paid
// @route   PUT /api/remittances/:id/mark-paid
// @access  Private (Admin/Finance)
const markPaidController = async (req, res) => {
  try {
    const { paymentDate } = req.body;
    const remittanceId = req.params.id;

    const remittance = await markRemittanceAsPaid(
      remittanceId,
      paymentDate ? new Date(paymentDate) : null
    );

    res.status(200).json({
      success: true,
      data: remittance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update commission status for a policy
// @route   PUT /api/policies/:id/update-commission
// @access  Private (Admin/Finance)
const updateCommissionStatus = async (req, res) => {
  try {
    const { commissionStatus, remittanceDate } = req.body;
    const InsurancePolicy = require('../models/InsurancePolicy');
    
    const policy = await InsurancePolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    if (commissionStatus) {
      policy.commissionStatus = commissionStatus;
    }
    if (remittanceDate) {
      policy.remittanceDate = new Date(remittanceDate);
    }

    await policy.save();

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllRemittances,
  createRemittanceController,
  reconcileRemittanceController,
  markPaidController,
  updateCommissionStatus
};

