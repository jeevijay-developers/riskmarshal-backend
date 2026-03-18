const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getQuotations,
  getPendingQuotations,
  updateQuotationStatus
} = require('../controllers/quotationController');

router.use(authenticate);

router.get('/', getQuotations);
router.get('/pending', getPendingQuotations);
router.put('/:id/status', updateQuotationStatus);

module.exports = router;
