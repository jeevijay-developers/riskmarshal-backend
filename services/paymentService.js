const InsurancePolicy = require('../models/InsurancePolicy');
const constants = require('../config/constants');

// Generic payment service - can be extended for specific gateways
// Example implementation for Razorpay
const createPaymentLink = async (policyId, amount, description = '') => {
  try {
    const policy = await InsurancePolicy.findById(policyId)
      .populate('client');

    if (!policy) {
      throw new Error('Policy not found');
    }

    // Generate payment ID
    const paymentId = `PAY${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // In production, integrate with actual payment gateway
    // Example for Razorpay:
    /*
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: paymentId,
      notes: {
        policyId: policyId.toString(),
        quotationId: policy.quotationId
      }
    };

    const order = await razorpay.orders.create(options);
    */

    // For now, return a mock payment link
    // In production, this would be the actual payment gateway link
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const paymentLink = `${baseUrl}/api/payments/process/${paymentId}`;

    // Update policy with payment ID
    policy.paymentId = paymentId;
    policy.paymentStatus = constants.PAYMENT_STATUS.PENDING;
    await policy.save();

    return {
      paymentId,
      paymentLink,
      amount,
      currency: 'INR'
    };
  } catch (error) {
    throw new Error(`Payment link creation failed: ${error.message}`);
  }
};

const verifyPayment = async (paymentId, paymentData) => {
  try {
    // In production, verify with payment gateway
    // Example for Razorpay:
    /*
    const crypto = require('crypto');
    const razorpaySignature = paymentData.razorpay_signature;
    const razorpayOrderId = paymentData.razorpay_order_id;
    const razorpayPaymentId = paymentData.razorpay_payment_id;
    
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');
    
    if (generatedSignature !== razorpaySignature) {
      throw new Error('Invalid payment signature');
    }
    */

    // Find policy by payment ID
    const policy = await InsurancePolicy.findOne({ paymentId });
    if (!policy) {
      throw new Error('Policy not found for this payment');
    }

    // Update payment status
    policy.paymentStatus = constants.PAYMENT_STATUS.PAID;
    policy.status = constants.POLICY_STATUS.PAYMENT_PENDING;
    await policy.save();

    return {
      success: true,
      policyId: policy._id,
      paymentId
    };
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

const getPaymentStatus = async (paymentId) => {
  try {
    const policy = await InsurancePolicy.findOne({ paymentId });
    if (!policy) {
      throw new Error('Payment not found');
    }

    return {
      paymentId,
      status: policy.paymentStatus,
      amount: policy.premiumDetails?.finalPremium,
      policyId: policy._id
    };
  } catch (error) {
    throw new Error(`Payment status check failed: ${error.message}`);
  }
};

module.exports = {
  createPaymentLink,
  verifyPayment,
  getPaymentStatus
};

