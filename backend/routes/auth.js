const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role: role || 'executive'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Validate password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        dutyStatus: user.dutyStatus,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get current user details
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        dutyStatus: user.dutyStatus,
        currentLocation: user.currentLocation,
        settings: user.settings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message
    });
  }
});

// Update FCM token for push notifications
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    await User.findByIdAndUpdate(req.userId, { fcmToken });

    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('FCM token update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
});

// Update user location
router.post('/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    await User.findByIdAndUpdate(req.userId, {
      currentLocation: {
        latitude,
        longitude,
        address,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Update duty status
router.post('/duty-status', auth, async (req, res) => {
  try {
    const { dutyStatus, location } = req.body;

    const updateData = { dutyStatus };
    
    if (location) {
      updateData.currentLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        timestamp: new Date()
      };
    }

    await User.findByIdAndUpdate(req.userId, updateData);

    res.json({
      success: true,
      message: `Duty status updated to ${dutyStatus ? 'ON' : 'OFF'}`,
      dutyStatus
    });
  } catch (error) {
    console.error('Duty status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update duty status',
      error: error.message
    });
  }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;

    await User.findByIdAndUpdate(req.userId, { settings });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    
    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

module.exports = router;
