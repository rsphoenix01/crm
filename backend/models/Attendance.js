// models/Attendance.js - Updated with Enhanced Location Support
const mongoose = require('mongoose');

// Enhanced location schema with complete address details
// Enhanced location schema - UPDATED to make fields optional for endLocation
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number
    // REMOVED: required: true
  },
  longitude: {
    type: Number
    // REMOVED: required: true
  },
  address: {
    type: String,
    default: 'Address not available'
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  addressComponents: {
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  captureMethod: {
    type: String,
    enum: ['gps', 'manual', 'network'],
    default: 'gps'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Rest of the schema stays the same...

// Individual duty session schema
const dutySessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  startLocation: locationSchema,  // Updated to use enhanced locationSchema
  endLocation: locationSchema,     // Updated to use enhanced locationSchema
  duration: Number, // in hours
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  
  // Array of duty sessions instead of single session
  dutySessions: [dutySessionSchema],
  
  // Legacy fields for backward compatibility (updated with enhanced location)
  dutyStartTime: Date,
  dutyEndTime: Date,
  dutyStartLocation: locationSchema,  // Updated
  dutyEndLocation: locationSchema,     // Updated
  
  // Calculated totals for all sessions combined
  totalHours: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  
  checkIns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckIn'
  }],
  
  // Overall status for the day
  status: {
    type: String,
    enum: ['on-duty', 'off-duty', 'on-leave'],
    default: 'off-duty'
  }
}, {
  timestamps: true
});

// Helper method to get current active session
attendanceSchema.methods.getCurrentSession = function() {
  return this.dutySessions.find(session => session.status === 'active');
};

// Helper method to calculate total hours from all sessions
attendanceSchema.methods.calculateTotalHours = function() {
  let total = 0;
  this.dutySessions.forEach(session => {
    if (session.duration) {
      total += session.duration;
    }
  });
  this.totalHours = Math.round(total * 100) / 100;
  return this.totalHours;
};

// Helper method to check if currently on duty
attendanceSchema.methods.isCurrentlyOnDuty = function() {
  return this.dutySessions.some(session => session.status === 'active');
};

// Pre-save middleware to update calculated fields
attendanceSchema.pre('save', function(next) {
  // Update overall status based on active sessions
  this.status = this.isCurrentlyOnDuty() ? 'on-duty' : 'off-duty';
  
  // Recalculate total hours
  this.calculateTotalHours();
  
  next();
});

// Ensure one attendance record per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);