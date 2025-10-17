// routes/attendance.js - Updated with Enhanced Location Support
const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get attendance records
router.get('/', auth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      page = 1, 
      limit = 30 
    } = req.query;

    let query = {};

    // Filter by user (default to current user unless admin/manager)
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
      if (userId) {
        query.user = userId;
      }
    } else {
      query.user = req.userId;
    }

    // Date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }

    const attendance = await Attendance.find(query)
      .populate('user', 'name email')
      .populate('checkIns')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance',
      error: error.message
    });
  }
});

// Mark duty start/end - UPDATED with Enhanced Location Support
router.post('/', auth, async (req, res) => {
  try {
    const { action, location } = req.body;

    console.log('📍 Received attendance request:', { action, location });

    // Validate location data
    if (!location || typeof location !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Location data is required'
      });
    }

    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Enhance location data with defaults
    const enhancedLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || 'Address not available',
      city: location.city || location.addressComponents?.city || '',
      state: location.state || location.addressComponents?.state || '',
      pincode: location.pincode || location.addressComponents?.pincode || '',
      addressComponents: {
        city: location.addressComponents?.city || location.city || '',
        state: location.addressComponents?.state || location.state || '',
        pincode: location.addressComponents?.pincode || location.pincode || '',
        country: location.addressComponents?.country || ''
      },
      captureMethod: location.captureMethod || 'gps',
      timestamp: location.timestamp || new Date().toISOString()
    };

    console.log('✅ Enhanced location data:', enhancedLocation);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create attendance record for today
    let attendance = await Attendance.findOne({
      user: req.userId,
      date: today
    });

    if (!attendance) {
      attendance = new Attendance({
        user: req.userId,
        date: today,
        dutySessions: [],
        checkIns: [],
        totalDistance: 0,
        totalHours: 0
      });
    }

    const now = new Date();

    if (action === 'start') {
      // Check if there's already an active session
      const activeSession = attendance.getCurrentSession();
      
      if (activeSession) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active duty session. Please end the current session first.',
          activeSession: {
            startTime: activeSession.startTime,
            startLocation: activeSession.startLocation
          }
        });
      }

      // Create new duty session with enhanced location
      const newSession = {
        startTime: now,
        startLocation: enhancedLocation,
        status: 'active'
      };

      attendance.dutySessions.push(newSession);
      
      // Update legacy fields for backward compatibility
      attendance.dutyStartTime = now;
      attendance.dutyStartLocation = enhancedLocation;

      // Update user duty status
      await User.findByIdAndUpdate(req.userId, { 
        dutyStatus: true,
        currentLocation: enhancedLocation
      });

      await attendance.save();

      console.log(`✅ Duty session started at: ${enhancedLocation.address}`);

      res.json({
        success: true,
        message: 'Duty session started successfully',
        attendance,
        currentSession: newSession,
        sessionNumber: attendance.dutySessions.length
      });

    } else if (action === 'end') {
      // Find the active session
      const activeSession = attendance.getCurrentSession();
      
      if (!activeSession) {
        return res.status(400).json({
          success: false,
          message: 'No active duty session found. Please start duty first.',
          totalSessions: attendance.dutySessions.length
        });
      }

      // End the active session with enhanced location
      activeSession.endTime = now;
      activeSession.endLocation = enhancedLocation;
      activeSession.status = 'completed';
      
      // Calculate session duration
      const durationMs = now - activeSession.startTime;
      activeSession.duration = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // hours

      // Update legacy fields for backward compatibility
      attendance.dutyEndTime = now;
      attendance.dutyEndLocation = enhancedLocation;

      // Update user duty status
      const hasOtherActiveSessions = attendance.dutySessions.some(
        session => session._id.toString() !== activeSession._id.toString() && session.status === 'active'
      );

      await User.findByIdAndUpdate(req.userId, { 
        dutyStatus: hasOtherActiveSessions,
        currentLocation: enhancedLocation
      });

      await attendance.save();

      console.log(`✅ Duty session ended at: ${enhancedLocation.address}. Duration: ${activeSession.duration} hours`);

      res.json({
        success: true,
        message: 'Duty session ended successfully',
        attendance,
        completedSession: {
          duration: activeSession.duration,
          startTime: activeSession.startTime,
          endTime: activeSession.endTime,
          startLocation: activeSession.startLocation,
          endLocation: activeSession.endLocation
        },
        totalSessionsToday: attendance.dutySessions.length,
        totalHoursToday: attendance.totalHours
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "start" or "end".'
      });
    }

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
});

// Get current duty status
// Get current duty status - FIXED VERSION
router.get('/status', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.userId,
      date: today
    });

    if (!attendance) {
      // No attendance record - ensure user dutyStatus is also false
      await User.findByIdAndUpdate(req.userId, { dutyStatus: false });
      
      return res.json({
        success: true,
        isOnDuty: false,
        totalSessions: 0,
        totalHours: 0,
        currentSession: null
      });
    }

    const activeSession = attendance.getCurrentSession();
    const isOnDuty = !!activeSession;

    // IMPORTANT: Sync user dutyStatus with actual session status
    await User.findByIdAndUpdate(req.userId, { dutyStatus: isOnDuty });

    res.json({
      success: true,
      isOnDuty,
      totalSessions: attendance.dutySessions.length,
      totalHours: attendance.totalHours,
      currentSession: activeSession,
      allSessions: attendance.dutySessions
    });

  } catch (error) {
    console.error('Get duty status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get duty status',
      error: error.message
    });
  }
});
// Force sync duty status - cleanup endpoint
router.post('/sync-status', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.userId,
      date: today
    });

    let isOnDuty = false;
    let activeSession = null;

    if (attendance) {
      activeSession = attendance.getCurrentSession();
      isOnDuty = !!activeSession;
    }

    // Force sync user dutyStatus with actual session state
    await User.findByIdAndUpdate(req.userId, { dutyStatus: isOnDuty });

    console.log(`✅ Synced duty status for user ${req.userId}: ${isOnDuty ? 'ON' : 'OFF'}`);

    res.json({
      success: true,
      message: 'Duty status synced successfully',
      isOnDuty,
      currentSession: activeSession
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync duty status',
      error: error.message
    });
  }
});

// Get attendance statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    let matchQuery = {};

    // Filter by user
    const user = await User.findById(req.userId);
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      if (userId) {
        matchQuery.user = mongoose.Types.ObjectId(userId);
      }
    } else {
      matchQuery.user = mongoose.Types.ObjectId(req.userId);
    }

    // Date range
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalHours: { $sum: '$totalHours' },
          totalDistance: { $sum: '$totalDistance' },
          totalCheckIns: { $sum: { $size: '$checkIns' } },
          totalSessions: { $sum: { $size: '$dutySessions' } },
          avgHoursPerDay: { $avg: '$totalHours' },
          avgDistancePerDay: { $avg: '$totalDistance' },
          avgSessionsPerDay: { $avg: { $size: '$dutySessions' } }
        }
      }
    ]);

    const result = stats[0] || {
      totalDays: 0,
      totalHours: 0,
      totalDistance: 0,
      totalCheckIns: 0,
      totalSessions: 0,
      avgHoursPerDay: 0,
      avgDistancePerDay: 0,
      avgSessionsPerDay: 0
    };

    // Round averages
    result.avgHoursPerDay = Math.round(result.avgHoursPerDay * 100) / 100;
    result.avgDistancePerDay = Math.round(result.avgDistancePerDay * 100) / 100;
    result.avgSessionsPerDay = Math.round(result.avgSessionsPerDay * 100) / 100;

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance statistics',
      error: error.message
    });
  }
});

module.exports = router;