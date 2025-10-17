// routes/leaves.js
const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get leave applications
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      type, 
      userId, 
      startDate, 
      endDate, 
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

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.fromDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leaves = await Leave.find(query)
      .populate('user', 'name email phone')
      .populate('approvedBy', 'name email')
      .sort({ appliedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaves',
      error: error.message
    });
  }
});

// Apply for leave
router.post('/', auth, async (req, res) => {
  try {
    const { type, fromDate, toDate, reason, attachments } = req.body;

    // Calculate number of days
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range'
      });
    }

    const leave = new Leave({
      user: req.userId,
      type,
      fromDate: from,
      toDate: to,
      days,
      reason,
      attachments: attachments || []
    });

    await leave.save();
    await leave.populate('user', 'name email phone');

    // Notify managers/admins
    const managers = await User.find({ 
      role: { $in: ['admin', 'manager'] },
      isActive: true 
    });

    for (const manager of managers) {
      const notification = new Notification({
        recipient: manager._id,
        sender: req.userId,
        title: 'New Leave Application',
        message: `${req.user.name} applied for ${type} from ${from.toDateString()} to ${to.toDateString()}`,
        type: 'leave',
        data: { leaveId: leave._id }
      });
      await notification.save();

      // Send real-time notification
      const io = req.app.get('io');
      io.to(manager._id.toString()).emit('leaveApplication', {
        leave,
        applicant: req.user,
        notification
      });
    }

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      leave
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for leave',
      error: error.message
    });
  }
});

// Update leave status (approve/reject) - Admin/Manager only
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only admins and managers can approve/reject leaves'
      });
    }

    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    const leave = await Leave.findById(req.params.id)
      .populate('user', 'name email phone');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave application already processed'
      });
    }

    leave.status = status;
    leave.approvedBy = req.userId;
    leave.approvedDate = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();
    await leave.populate('approvedBy', 'name email');

    // Notify the applicant
    const notification = new Notification({
      recipient: leave.user._id,
      sender: req.userId,
      title: `Leave Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${leave.type} application has been ${status}${status === 'rejected' && rejectionReason ? ': ' + rejectionReason : ''}`,
      type: 'leave',
      data: { leaveId: leave._id }
    });
    await notification.save();

    // Send real-time notification
    const io = req.app.get('io');
    io.to(leave.user._id.toString()).emit('leaveStatusChanged', {
      leave,
      status,
      approver: req.user,
      notification
    });

    res.json({
      success: true,
      message: `Leave application ${status} successfully`,
      leave
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave application',
      error: error.message
    });
  }
});

// Get leave balance for user
router.get('/balance/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;

    // Only allow users to see their own balance unless admin/manager
    if (userId !== req.userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own leave balance'
      });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Get approved leaves for current year
    const leaves = await Leave.find({
      user: userId,
      status: 'approved',
      fromDate: { $gte: yearStart, $lte: yearEnd }
    });

    // Calculate used days by type
    const usedDays = {
      'Sick Leave': 0,
      'Casual Leave': 0,
      'Earned Leave': 0,
      'Emergency Leave': 0
    };

    leaves.forEach(leave => {
      usedDays[leave.type] += leave.days;
    });

    // Standard leave allocation (can be made configurable)
    const allocation = {
      'Sick Leave': 12,
      'Casual Leave': 12,
      'Earned Leave': 21,
      'Emergency Leave': 5
    };

    const balance = {
      'Sick Leave': Math.max(0, allocation['Sick Leave'] - usedDays['Sick Leave']),
      'Casual Leave': Math.max(0, allocation['Casual Leave'] - usedDays['Casual Leave']),
      'Earned Leave': Math.max(0, allocation['Earned Leave'] - usedDays['Earned Leave']),
      'Emergency Leave': Math.max(0, allocation['Emergency Leave'] - usedDays['Emergency Leave'])
    };

    res.json({
      success: true,
      leaveBalance: {
        allocation,
        used: usedDays,
        balance,
        year: currentYear
      }
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave balance',
      error: error.message
    });
  }
});

module.exports = router;