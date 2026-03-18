const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser
} = require('../controllers/userController');

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deactivateUser);

module.exports = router;
