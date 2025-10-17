const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get tasks based on type (myTasks or assignedByMe)
router.get('/', auth, async (req, res) => {
  try {
    const { type = 'myTasks', status, priority, page = 1, limit = 20 } = req.query;

    let query = {};
    
    if (type === 'myTasks') {
      query.assigneeId = req.userId;
    } else if (type === 'assignedByMe') {
      query.assignerId = req.userId;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    const tasks = await Task.find(query)
      .populate('assignerId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('comments.author', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks',
      error: error.message
    });
  }
});

// Get task by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignerId', 'name email')
      .populate('assigneeId', 'name email')
      .populate('comments.author', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task',
      error: error.message
    });
  }
});

// Create new task (P2P - any user can assign to any user)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, assigneeId } = req.body;

    // Validate assignee exists
    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      return res.status(400).json({
        success: false,
        message: 'Assignee not found'
      });
    }

    const task = new Task({
      title,
      description,
      priority,
      dueDate,
      assignerId: req.userId,
      assigneeId
    });

    await task.save();
    await task.populate('assignerId', 'name email');
    await task.populate('assigneeId', 'name email');

    // Create notification for assignee
    const notification = new Notification({
      recipient: assigneeId,
      sender: req.userId,
      title: 'New Task Assigned',
      message: `${req.user.name} assigned you: ${title}`,
      type: 'task',
      data: { taskId: task._id }
    });
    await notification.save();

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    io.to(assigneeId).emit('taskAssigned', {
      task,
      assigner: req.user,
      notification
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only assigner can edit task details, only assignee can mark as complete
    const isAssigner = task.assignerId.toString() === req.userId;
    const isAssignee = task.assigneeId.toString() === req.userId;

    if (!isAssigner && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you or by you'
      });
    }

    // If assignee is marking as complete
    if (req.body.completed && isAssignee) {
      task.completed = req.body.completed;
      task.completedAt = req.body.completed ? new Date() : null;
      task.status = req.body.completed ? 'completed' : 'pending';
    } else if (isAssigner) {
      // Assigner can update other fields
      Object.assign(task, req.body);
    }

    await task.save();
    await task.populate('assignerId', 'name email');
    await task.populate('assigneeId', 'name email');

    // Send notification if task was completed
    if (req.body.completed && isAssignee) {
      const notification = new Notification({
        recipient: task.assignerId,
        sender: req.userId,
        title: 'Task Completed',
        message: `${req.user.name} completed: ${task.title}`,
        type: 'task',
        data: { taskId: task._id }
      });
      await notification.save();

      // Send real-time notification
      const io = req.app.get('io');
      io.to(task.assignerId.toString()).emit('taskCompleted', {
        task,
        assignee: req.user,
        notification
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
});

// Delete task (only assigner can delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only assigner can delete task
    if (task.assignerId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete tasks assigned by you'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

// Add comment to task
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only assigner and assignee can comment
    const isAssigner = task.assignerId.toString() === req.userId;
    const isAssignee = task.assigneeId.toString() === req.userId;

    if (!isAssigner && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: 'You can only comment on tasks assigned to you or by you'
      });
    }

    task.comments.push({
      comment,
      author: req.userId,
      timestamp: new Date()
    });

    await task.save();
    await task.populate('comments.author', 'name');

    res.json({
      success: true,
      message: 'Comment added successfully',
      task
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// Get task statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const [myTasksStats, assignedByMeStats] = await Promise.all([
      // My tasks statistics
      Task.aggregate([
        { $match: { assigneeId: mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: ['$completed', 1, 0] } },
            pending: { $sum: { $cond: ['$completed', 0, 1] } },
            overdue: {
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
      
      // Assigned by me statistics
      Task.aggregate([
        { $match: { assignerId: mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: ['$completed', 1, 0] } },
            pending: { $sum: { $cond: ['$completed', 0, 1] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        myTasks: myTasksStats[0] || { total: 0, completed: 0, pending: 0, overdue: 0 },
        assignedByMe: assignedByMeStats[0] || { total: 0, completed: 0, pending: 0 }
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task statistics',
      error: error.message
    });
  }
});

module.exports = router;