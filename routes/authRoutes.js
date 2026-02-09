const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
  updateNotifications,
  updateOrganization,
  getOrganization
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

// Profile and settings routes
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.put('/notifications', authenticate, updateNotifications);
router.get('/organization', authenticate, getOrganization);
router.put('/organization', authenticate, updateOrganization);

module.exports = router;
