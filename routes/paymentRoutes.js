const express = require('express');
const router = express.Router();
const {
  createPayment,
  handlePaymentWebhook,
  getPaymentStatusController
} = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { verifyWebhookSignature } = require('../middleware/paymentWebhook');

router.post('/webhook', verifyWebhookSignature, handlePaymentWebhook);

module.exports = router;

