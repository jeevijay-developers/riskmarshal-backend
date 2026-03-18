const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getCommissions,
  getCommissionConfig,
  configureCommissionRates,
  updateCommissionStatus
} = require('../controllers/commissionController');

// All commission endpoints are admin-only
router.use(authenticate, authorize('admin'));

router.get('/', getCommissions);
router.get('/config', getCommissionConfig);
router.post('/configure', configureCommissionRates);
router.put('/:policyId/status', updateCommissionStatus);

module.exports = router;
