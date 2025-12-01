const {
  createPolicy,
  updatePolicy,
  getPolicies,
  getPolicyById,
  deletePolicy
} = require('../services/policyService');
const { calculateAndUpdatePolicy } = require('../services/calculationService');
const { generateQuotation } = require('../services/quotationService');
const { sendQuotation } = require('../services/communicationService');
const { generatePolicy, addToDataStore } = require('../services/policyGenerationService');
const Insurer = require('../models/Insurer');
const PolicyType = require('../models/PolicyType');

// @desc    Get all policy types
// @route   GET /api/policy-types
// @access  Private
const getPolicyTypes = async (req, res) => {
  try {
    const policyTypes = await PolicyType.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: policyTypes.length,
      data: policyTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all insurers
// @route   GET /api/insurers
// @access  Private
const getInsurers = async (req, res) => {
  try {
    const insurers = await Insurer.find({ isActive: true })
      .populate('productTypes')
      .sort({ companyName: 1 });

    res.status(200).json({
      success: true,
      count: insurers.length,
      data: insurers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get policy types for an insurer
// @route   GET /api/insurers/:id/policy-types
// @access  Private
const getInsurerPolicyTypes = async (req, res) => {
  try {
    const insurer = await Insurer.findById(req.params.id).populate('productTypes');
    if (!insurer) {
      return res.status(404).json({
        success: false,
        message: 'Insurer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: insurer.productTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new policy
// @route   POST /api/policies
// @access  Private
const createPolicyController = async (req, res) => {
  try {
    const policy = await createPolicy(req.body, req.user._id);

    res.status(201).json({
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

// @desc    Get all policies
// @route   GET /api/policies
// @access  Private
const getAllPolicies = async (req, res) => {
  try {
    const filters = {
      insurer: req.query.insurer,
      policyType: req.query.policyType,
      client: req.query.client,
      subagent: req.query.subagent,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      createdBy: req.user.role === 'admin' ? req.query.createdBy : req.user._id
    };

    const options = {
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await getPolicies(filters, options);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single policy
// @route   GET /api/policies/:id
// @access  Private
const getSinglePolicy = async (req, res) => {
  try {
    const policy = await getPolicyById(req.params.id);

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update policy
// @route   PUT /api/policies/:id
// @access  Private
const updatePolicyController = async (req, res) => {
  try {
    const policy = await updatePolicy(req.params.id, req.body);

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

// @desc    Delete policy
// @route   DELETE /api/policies/:id
// @access  Private
const deletePolicyController = async (req, res) => {
  try {
    await deletePolicy(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Calculate premium and commission
// @route   POST /api/policies/:id/calculate
// @access  Private
const calculatePremium = async (req, res) => {
  try {
    const { coverageDetails } = req.body;
    const result = await calculateAndUpdatePolicy(req.params.id, coverageDetails);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get premium breakdown
// @route   GET /api/policies/:id/premium-breakdown
// @access  Private
const getPremiumBreakdown = async (req, res) => {
  try {
    const policy = await getPolicyById(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        premiumDetails: policy.premiumDetails,
        commission: policy.commission
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate quotation
// @route   POST /api/policies/:id/generate-quotation
// @access  Private
const generateQuotationController = async (req, res) => {
  try {
    const result = await generateQuotation(req.params.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send quotation
// @route   POST /api/policies/:id/send-quotation
// @access  Private
const sendQuotationController = async (req, res) => {
  try {
    const { channels, recipient } = req.body;

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one communication channel'
      });
    }

    const result = await sendQuotation(req.params.id, channels, recipient);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate policy PDF
// @route   POST /api/policies/:id/generate-policy
// @access  Private
const generatePolicyController = async (req, res) => {
  try {
    const result = await generatePolicy(req.params.id);
    
    // Add to data store
    await addToDataStore(req.params.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getPolicyTypes,
  getInsurers,
  getInsurerPolicyTypes,
  createPolicyController,
  getAllPolicies,
  getSinglePolicy,
  updatePolicyController,
  deletePolicyController,
  calculatePremium,
  getPremiumBreakdown,
  generateQuotationController,
  sendQuotationController,
  generatePolicyController
};

