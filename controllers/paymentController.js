const {
  createPaymentLink,
  verifyPayment,
  getPaymentStatus
} = require('../services/paymentService');
const { generatePolicy } = require('../services/policyGenerationService');
const { sendQuotation } = require('../services/communicationService');

// @desc    Create payment link for policy
// @route   POST /api/policies/:id/create-payment
// @access  Private
const createPayment = async (req, res) => {
  try {
    const policyId = req.params.id;
    const { amount } = req.body;

    const paymentData = await createPaymentLink(policyId, amount);

    res.status(200).json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Handle payment webhook
// @route   POST /api/payments/webhook
// @access  Public (but should verify webhook signature)
const handlePaymentWebhook = async (req, res) => {
  try {
    const { paymentId, paymentData } = req.body;

    // Verify payment
    const verificationResult = await verifyPayment(paymentId, paymentData);

    // If payment successful, generate policy
    if (verificationResult.success) {
      // Generate policy PDF
      await generatePolicy(verificationResult.policyId);

      // Send delivery confirmation
      await sendQuotation(verificationResult.policyId, ['email'], null);
    }

    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment status
// @route   GET /api/policies/:id/payment-status
// @access  Private
const getPaymentStatusController = async (req, res) => {
  try {
    const policyId = req.params.id;
    const policy = await require('../models/InsurancePolicy').findById(policyId);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found'
      });
    }

    if (!policy.paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment not initiated for this policy'
      });
    }

    const status = await getPaymentStatus(policy.paymentId);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPayment,
  handlePaymentWebhook,
  getPaymentStatusController
};

