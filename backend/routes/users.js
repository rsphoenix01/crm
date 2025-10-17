const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user's profile - MUST be before /:id route
// Get current user's profile - MUST be before /:id route
router.get('/profile', auth, async (req, res) => {
  try {
    // Use req.userId (set by auth middleware)
    const user = await User.findById(req.userId)
      .select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// Get all users (for P2P task assignment)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email phone role')
      .sort({ name: 1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
});

// Get user by ID - MUST be after /profile route
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email phone role dutyStatus currentLocation');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

module.exports = router;