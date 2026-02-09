const bcrypt = require('bcrypt');
const User = require('../models/User');
const Subagent = require('../models/Subagent');
const { generateToken } = require('../utils/jwt');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, role, subagentCode, firstName, lastName, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // If subagent role, verify subagent exists
    let subagentId = null;
    if (role === 'subagent' && subagentCode) {
      const subagent = await Subagent.findOne({ code: subagentCode });
      if (!subagent) {
        return res.status(400).json({
          success: false,
          message: 'Subagent code not found'
        });
      }
      subagentId = subagent._id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      subagent: subagentId,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || ''
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('subagent', 'name code contact email')
      .select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/auth/notifications
// @access  Private
const updateNotifications = async (req, res) => {
  try {
    const { email, renewalReminders, claimsAlerts, newClients } = req.body;

    const updateData = { notificationPreferences: {} };
    if (email !== undefined) updateData.notificationPreferences.email = email;
    if (renewalReminders !== undefined) updateData.notificationPreferences.renewalReminders = renewalReminders;
    if (claimsAlerts !== undefined) updateData.notificationPreferences.claimsAlerts = claimsAlerts;
    if (newClients !== undefined) updateData.notificationPreferences.newClients = newClients;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update organization settings
// @route   PUT /api/auth/organization
// @access  Private (admin only)
const updateOrganization = async (req, res) => {
  try {
    const { 
      companyName, logo, address, city, state, pincode, gstNumber,
      apiConfig 
    } = req.body;

    // Only admins can update organization settings
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update organization settings'
      });
    }

    const updateData = { organization: {} };
    if (companyName !== undefined) updateData.organization.companyName = companyName;
    if (logo !== undefined) updateData.organization.logo = logo;
    if (address !== undefined) updateData.organization.address = address;
    if (city !== undefined) updateData.organization.city = city;
    if (state !== undefined) updateData.organization.state = state;
    if (pincode !== undefined) updateData.organization.pincode = pincode;
    if (gstNumber !== undefined) updateData.organization.gstNumber = gstNumber;

    // API config (sensitive data)
    if (apiConfig) {
      updateData.organization.apiConfig = {};
      if (apiConfig.whatsappApiKey !== undefined) {
        updateData.organization.apiConfig.whatsappApiKey = apiConfig.whatsappApiKey;
      }
      if (apiConfig.whatsappPhoneId !== undefined) {
        updateData.organization.apiConfig.whatsappPhoneId = apiConfig.whatsappPhoneId;
      }
      if (apiConfig.emailSmtpHost !== undefined) {
        updateData.organization.apiConfig.emailSmtpHost = apiConfig.emailSmtpHost;
      }
      if (apiConfig.emailSmtpPort !== undefined) {
        updateData.organization.apiConfig.emailSmtpPort = apiConfig.emailSmtpPort;
      }
      if (apiConfig.emailSmtpUser !== undefined) {
        updateData.organization.apiConfig.emailSmtpUser = apiConfig.emailSmtpUser;
      }
      if (apiConfig.emailSmtpPass !== undefined) {
        updateData.organization.apiConfig.emailSmtpPass = apiConfig.emailSmtpPass;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select('-password -organization.apiConfig.whatsappApiKey -organization.apiConfig.emailSmtpPass');

    res.status(200).json({
      success: true,
      data: user.organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get organization settings
// @route   GET /api/auth/organization
// @access  Private
const getOrganization = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('organization -organization.apiConfig.whatsappApiKey -organization.apiConfig.emailSmtpPass');

    res.status(200).json({
      success: true,
      data: user?.organization || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
  updateNotifications,
  updateOrganization,
  getOrganization
};
