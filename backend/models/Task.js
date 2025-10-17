const mongoose = require('mongoose');

const taskCommentSchema = new mongoose.Schema({
  comment: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  dueDate: Date,
  assignerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  comments: [taskCommentSchema],
  attachments: [String]
}, {
  timestamps: true
});

// Populate assigner and assignee details
taskSchema.pre(['find', 'findOne'], function() {
  this.populate('assignerId', 'name email')
      .populate('assigneeId', 'name email');
});

module.exports = mongoose.model('Task', taskSchema);