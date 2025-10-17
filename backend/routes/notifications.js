const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { read, type, page = 1, limit = 20 } = req.query;

    let query = { recipient: req.userId };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      read: false
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.userId
      },
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Create notification (internal use by other routes)
router.post('/', auth, async (req, res) => {
  try {
    const { recipient, title, message, type, data } = req.body;

    const notification = new Notification({
      recipient,
      sender: req.userId,
      title,
      message,
      type,
      data
    });

    await notification.save();
    await notification.populate('sender', 'name email');

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    io.to(recipient).emit('notification', notification);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $match: { recipient: mongoose.Types.ObjectId(req.userId) }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: ['$read', 0, 1] }
          },
          byType: {
            $push: {
              type: '$type',
              read: '$read'
            }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, unread: 0, byType: [] };

    // Group by type
    const typeStats = {};
    result.byType.forEach(item => {
      if (!typeStats[item.type]) {
        typeStats[item.type] = { total: 0, unread: 0 };
      }
      typeStats[item.type].total++;
      if (!item.read) {
        typeStats[item.type].unread++;
      }
    });

    res.json({
      success: true,
      stats: {
        total: result.total,
        unread: result.unread,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
});

module.exports = router;