const crypto = require('crypto');

// Middleware to verify payment webhook signature
// This is a generic implementation - adjust based on your payment gateway
const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-payment-signature'] || req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      // In development, skip verification
      if (process.env.NODE_ENV === 'development') {
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Webhook signature missing'
      });
    }

    // Verify signature (example for Razorpay)
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Webhook verification failed'
    });
  }
};

module.exports = {
  verifyWebhookSignature
};

