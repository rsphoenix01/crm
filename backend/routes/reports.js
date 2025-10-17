const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Enquiry = require('../models/Enquiry');
const Order = require('../models/Order');
const Task = require('../models/Task');
const CheckIn = require('../models/CheckIn');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const router = express.Router();

// Get daily report for a user
router.get('/daily', auth, async (req, res) => {
  try {
    const { date, userId } = req.query;
    
    // Use provided userId if admin/manager, otherwise use current user
    const targetUserId = (req.user.role === 'admin' || req.user.role === 'manager') && userId 
      ? userId 
      : req.userId;

    const reportDate = date ? new Date(date) : new Date();
    const startDate = new Date(reportDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    // Get user details
    const user = await User.findById(targetUserId).select('name email');

    // Get attendance for the day
    const attendance = await Attendance.findOne({
      user: targetUserId,
      date: startDate
    }).populate('checkIns');

    // Get check-ins for the day
    const checkIns = await CheckIn.find({
      user: targetUserId,
      checkInTime: { $gte: startDate, $lte: endDate }
    }).populate('customer', 'name contactPerson');

    // Get tasks completed today
    const tasksCompleted = await Task.find({
      assigneeId: targetUserId,
      completed: true,
      completedAt: { $gte: startDate, $lte: endDate }
    }).populate('assignerId', 'name');

    // Get enquiries created today
    const enquiries = await Enquiry.find({
      createdBy: targetUserId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('customer', 'name');

    // Get orders created today
    const orders = await Order.find({
      createdBy: targetUserId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('customer', 'name');

    // Calculate summary statistics
    const summary = {
      workingHours: attendance?.totalHours || 0,
      distanceTraveled: attendance?.totalDistance || 0,
      customerVisits: checkIns.filter(c => c.type === 'customer').length,
      generalCheckIns: checkIns.filter(c => c.type === 'general').length,
      tasksCompleted: tasksCompleted.length,
      enquiriesCreated: enquiries.length,
      ordersCreated: orders.length,
      totalOrderValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      dutyStartTime: attendance?.dutyStartTime,
      dutyEndTime: attendance?.dutyEndTime
    };

    res.json({
      success: true,
      report: {
        user,
        date: reportDate,
        summary,
        attendance,
        checkIns,
        tasksCompleted,
        enquiries,
        orders
      }
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily report',
      error: error.message
    });
  }
});

// Get performance report for a user over a period
router.get('/performance', auth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const targetUserId = (req.user.role === 'admin' || req.user.role === 'manager') && userId 
      ? userId 
      : req.userId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Get user details
    const user = await User.findById(targetUserId).select('name email role');

    // Parallel execution of all queries
    const [
      totalCustomersVisited,
      totalEnquiries,
      totalOrders,
      totalRevenue,
      tasksStats,
      attendanceStats,
      customerVisitStats,
      conversionStats
    ] = await Promise.all([
      // Total unique customers visited
      CheckIn.distinct('customer', {
        user: targetUserId,
        type: 'customer',
        checkInTime: { $gte: start, $lte: end }
      }),

      // Total enquiries created
      Enquiry.countDocuments({
        createdBy: targetUserId,
        createdAt: { $gte: start, $lte: end }
      }),

      // Total orders created
      Order.countDocuments({
        createdBy: targetUserId,
        createdAt: { $gte: start, $lte: end }
      }),

      // Total revenue from orders - FIXED: Remove ObjectId wrapper
      Order.aggregate([
        {
          $match: {
            createdBy: targetUserId, // ✅ FIXED: Use string directly
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),

      // Task statistics - FIXED: Remove ObjectId wrapper
      Task.aggregate([
        {
          $match: {
            assigneeId: targetUserId, // ✅ FIXED: Use string directly
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: ['$completed', 1, 0] }
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $not: '$completed' },
                      { $lt: ['$dueDate', new Date()] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Attendance statistics - FIXED: Remove ObjectId wrapper
      Attendance.aggregate([
        {
          $match: {
            user: targetUserId, // ✅ FIXED: Use string directly
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            totalHours: { $sum: '$totalHours' },
            totalDistance: { $sum: '$totalDistance' },
            averageHours: { $avg: '$totalHours' },
            averageDistance: { $avg: '$totalDistance' }
          }
        }
      ]),

      // Customer visit statistics - FIXED: Remove ObjectId wrapper
      CheckIn.aggregate([
        {
          $match: {
            user: targetUserId, // ✅ FIXED: Use string directly
            type: 'customer',
            checkInTime: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: 1 },
            averageDuration: { $avg: '$duration' },
            totalDuration: { $sum: '$duration' }
          }
        }
      ]),

      // Conversion statistics (enquiry to order) - FIXED: Remove ObjectId wrapper
      Enquiry.aggregate([
        {
          $match: {
            createdBy: targetUserId, // ✅ FIXED: Use string directly
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalEnquiries: { $sum: 1 },
            convertedEnquiries: {
              $sum: { $cond: [{ $eq: ['$status', 'order done'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Calculate conversion rate
    const conversionRate = conversionStats[0] && conversionStats[0].totalEnquiries > 0
      ? (conversionStats[0].convertedEnquiries / conversionStats[0].totalEnquiries) * 100
      : 0;

    // Calculate task completion rate
    const taskCompletionRate = tasksStats[0] && tasksStats[0].totalTasks > 0
      ? (tasksStats[0].completedTasks / tasksStats[0].totalTasks) * 100
      : 0;

    const performanceReport = {
      user,
      period: { startDate: start, endDate: end },
      overview: {
        totalCustomersVisited: totalCustomersVisited.length,
        totalEnquiries,
        totalOrders,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        totalPaid: totalRevenue[0]?.totalPaid || 0,
        averageOrderValue: totalRevenue[0]?.averageOrderValue || 0,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      tasks: {
        total: tasksStats[0]?.totalTasks || 0,
        completed: tasksStats[0]?.completedTasks || 0,
        overdue: tasksStats[0]?.overdueTasks || 0,
        completionRate: Math.round(taskCompletionRate * 100) / 100
      },
      attendance: {
        totalDays: attendanceStats[0]?.totalDays || 0,
        totalHours: Math.round((attendanceStats[0]?.totalHours || 0) * 100) / 100,
        totalDistance: Math.round((attendanceStats[0]?.totalDistance || 0) * 100) / 100,
        averageHours: Math.round((attendanceStats[0]?.averageHours || 0) * 100) / 100,
        averageDistance: Math.round((attendanceStats[0]?.averageDistance || 0) * 100) / 100
      },
      customerVisits: {
        totalVisits: customerVisitStats[0]?.totalVisits || 0,
        averageDuration: Math.round((customerVisitStats[0]?.averageDuration || 0)),
        totalDuration: customerVisitStats[0]?.totalDuration || 0
      }
    };

    res.json({
      success: true,
      report: performanceReport
    });
  } catch (error) {
    console.error('Get performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance report',
      error: error.message
    });
  }
});

// Get team report (Admin/Manager only)
router.get('/team', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only admins and managers can view team reports'
      });
    }

    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Get all active users
    const users = await User.find({ 
      isActive: true, 
      role: 'executive' 
    }).select('name email');

    const teamStats = [];

    for (const user of users) {
      const [
        customerVisits,
        enquiries,
        orders,
        revenue,
        tasksCompleted,
        attendance
      ] = await Promise.all([
        CheckIn.countDocuments({
          user: user._id,
          type: 'customer',
          checkInTime: { $gte: start, $lte: end }
        }),
        
        Enquiry.countDocuments({
          createdBy: user._id,
          createdAt: { $gte: start, $lte: end }
        }),
        
        Order.countDocuments({
          createdBy: user._id,
          createdAt: { $gte: start, $lte: end }
        }),
        
        Order.aggregate([
          {
            $match: {
              createdBy: user._id, // This is already an ObjectId from the database
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' }
            }
          }
        ]),
        
        Task.countDocuments({
          assigneeId: user._id,
          completed: true,
          completedAt: { $gte: start, $lte: end }
        }),
        
        Attendance.aggregate([
          {
            $match: {
              user: user._id, // This is already an ObjectId from the database
              date: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: null,
              totalHours: { $sum: '$totalHours' },
              totalDistance: { $sum: '$totalDistance' }
            }
          }
        ])
      ]);

      teamStats.push({
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        stats: {
          customerVisits,
          enquiries,
          orders,
          revenue: revenue[0]?.totalRevenue || 0,
          tasksCompleted,
          totalHours: Math.round((attendance[0]?.totalHours || 0) * 100) / 100,
          totalDistance: Math.round((attendance[0]?.totalDistance || 0) * 100) / 100
        }
      });
    }

    // Calculate team totals
    const teamTotals = teamStats.reduce((totals, member) => {
      totals.customerVisits += member.stats.customerVisits;
      totals.enquiries += member.stats.enquiries;
      totals.orders += member.stats.orders;
      totals.revenue += member.stats.revenue;
      totals.tasksCompleted += member.stats.tasksCompleted;
      totals.totalHours += member.stats.totalHours;
      totals.totalDistance += member.stats.totalDistance;
      return totals;
    }, {
      customerVisits: 0,
      enquiries: 0,
      orders: 0,
      revenue: 0,
      tasksCompleted: 0,
      totalHours: 0,
      totalDistance: 0
    });

    res.json({
      success: true,
      report: {
        period: { startDate: start, endDate: end },
        teamSize: users.length,
        teamTotals,
        teamStats: teamStats.sort((a, b) => b.stats.revenue - a.stats.revenue)
      }
    });
  } catch (error) {
    console.error('Get team report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team report',
      error: error.message
    });
  }
});

// Get dashboard statistics - FIXED: Remove ObjectId wrapper
router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayCustomers,
      pendingEnquiries,
      todayOrders,
      monthlyRevenue,
      myTasks,
      todayAttendance
    ] = await Promise.all([
      // Today's customer visits
      CheckIn.countDocuments({
        user: req.userId,
        type: 'customer',
        checkInTime: { $gte: today, $lt: tomorrow }
      }),

      // Pending enquiries
      Enquiry.countDocuments({
        createdBy: req.userId,
        status: { $in: ['pending', 'quoted'] }
      }),

      // Today's orders
      Order.countDocuments({
        createdBy: req.userId,
        createdAt: { $gte: today, $lt: tomorrow }
      }),

      // This month's revenue - FIXED: Remove ObjectId wrapper
      Order.aggregate([
        {
          $match: {
            createdBy: req.userId, // ✅ FIXED: Use string directly instead of mongoose.Types.ObjectId(req.userId)
            createdAt: {
              $gte: new Date(today.getFullYear(), today.getMonth(), 1),
              $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]),

      // My pending tasks
      Task.countDocuments({
        assigneeId: req.userId,
        completed: false
      }),

      // Today's attendance
      Attendance.findOne({
        user: req.userId,
        date: today
      })
    ]);

    const stats = {
      todayCustomers,
      pendingEnquiries,
      todayOrders,
      totalRevenue: monthlyRevenue[0]?.totalRevenue || 0, // Changed from monthlyRevenue to totalRevenue for clarity
      pendingTasks: myTasks,
      dutyStatus: req.user.dutyStatus,
      workingHours: todayAttendance?.totalHours || 0,
      distanceTraveled: todayAttendance?.totalDistance || 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
});

module.exports = router;