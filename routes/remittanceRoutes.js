const express = require('express');
const router = express.Router();
const {
  getAllRemittances,
  createRemittanceController,
  reconcileRemittanceController,
  markPaidController,
  updateCommissionStatus
} = require('../controllers/remittanceController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Finance/Admin only routes
router.get('/', authorize('admin', 'agent'), getAllRemittances);
router.post('/', authorize('admin', 'agent'), createRemittanceController);
router.put('/:id/reconcile', authorize('admin', 'agent'), reconcileRemittanceController);
router.put('/:id/mark-paid', authorize('admin', 'agent'), markPaidController);
router.put('/policies/:id/update-commission', authorize('admin', 'agent'), updateCommissionStatus);

module.exports = router;

