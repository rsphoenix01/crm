const express = require('express');
const CheckIn = require('../models/CheckIn');
const Customer = require('../models/Customer');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const router = express.Router();

// Get check-ins with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      date, 
      customer, 
      type, 
      status, 
      userId, 
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {};

    // Filter by user (default to current user unless admin/manager)
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      if (userId) {
        query.user = userId;
      }
    } else {
      query.user = req.userId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.checkInTime = {
        $gte: startDate,
        $lt: endDate
      };
    }

    if (customer) {
      query.customer = customer;
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const checkIns = await CheckIn.find(query)
      .populate('user', 'name email')
      .populate('customer', 'name contactPerson phone')
      .sort({ checkInTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CheckIn.countDocuments(query);

    res.json({
      success: true,
      checkIns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get check-ins',
      error: error.message
    });
  }
});

// Create new check-in
router.post('/', auth, async (req, res) => {
  try {
    const {
      customer,
      type,
      checkInLocation,
      notes,
      purpose
    } = req.body;

    // Validate customer if type is 'customer'
    if (type === 'customer' && customer) {
      const customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return res.status(400).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    const checkIn = new CheckIn({
      user: req.userId,
      customer: type === 'customer' ? customer : undefined,
      type,
      checkInTime: new Date(),
      checkInLocation,
      notes,
      purpose,
      status: 'checked-in'
    });

    await checkIn.save();
    await checkIn.populate('user', 'name email');
    if (customer) {
      await checkIn.populate('customer', 'name contactPerson phone');
    }

    // Update today's attendance record
    await updateDailyAttendance(req.userId, checkIn._id);

    res.status(201).json({
      success: true,
      message: 'Check-in created successfully',
      checkIn
    });
  } catch (error) {
    console.error('Create check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create check-in',
      error: error.message
    });
  }
});

// Check-out (update existing check-in)
router.put('/:id/checkout', auth, async (req, res) => {
  try {
    const { checkOutLocation, notes } = req.body;

    const checkIn = await CheckIn.findById(req.params.id);
    
    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found'
      });
    }

    if (checkIn.user.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only check out your own check-ins'
      });
    }

    if (checkIn.status === 'checked-out') {
      return res.status(400).json({
        success: false,
        message: 'Already checked out'
      });
    }

    // Calculate duration and distance
    const checkOutTime = new Date();
    const duration = Math.round((checkOutTime - checkIn.checkInTime) / 60000); // in minutes

    let distance = 0;
    if (checkOutLocation && checkIn.checkInLocation) {
      distance = calculateDistance(
        checkIn.checkInLocation.latitude,
        checkIn.checkInLocation.longitude,
        checkOutLocation.latitude,
        checkOutLocation.longitude
      );
    }

    // Update check-in
    checkIn.checkOutTime = checkOutTime;
    checkIn.checkOutLocation = checkOutLocation;
    checkIn.duration = duration;
    checkIn.distance = distance;
    checkIn.status = 'checked-out';
    if (notes) checkIn.notes += (checkIn.notes ? '\n' : '') + `Check-out notes: ${notes}`;

    await checkIn.save();
    await checkIn.populate('user', 'name email');
    if (checkIn.customer) {
      await checkIn.populate('customer', 'name contactPerson phone');
    }

    // Update attendance with distance
    await updateDailyAttendance(req.userId, null, distance);

    res.json({
      success: true,
      message: 'Check-out completed successfully',
      checkIn
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check out',
      error: error.message
    });
  }
});

// Get check-in by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const checkIn = await CheckIn.findById(req.params.id)
      .populate('user', 'name email')
      .populate('customer', 'name contactPerson phone');

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found'
      });
    }

    res.json({
      success: true,
      checkIn
    });
  } catch (error) {
    console.error('Get check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get check-in',
      error: error.message
    });
  }
});

// Helper function to update daily attendance
async function updateDailyAttendance(userId, checkInId = null, additionalDistance = 0) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      user: userId,
      date: today
    });

    if (!attendance) {
      attendance = new Attendance({
        user: userId,
        date: today,
        checkIns: [],
        totalDistance: 0,
        totalHours: 0
      });
    }

    if (checkInId) {
      attendance.checkIns.push(checkInId);
    }

    if (additionalDistance > 0) {
      attendance.totalDistance += additionalDistance;
    }

    await attendance.save();
  } catch (error) {
    console.error('Update attendance error:', error);
  }
}

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

module.exports = router;
