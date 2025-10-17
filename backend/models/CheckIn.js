const mongoose = require('mongoose');

const locationDetailSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  address: String,
  accuracy: Number, // GPS accuracy in meters
  altitude: Number,
  speed: Number, // Speed in m/s if available
  heading: Number // Direction of travel
});

const checkInSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  type: {
    type: String,
    enum: ['customer', 'general'],
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: Date,
  checkInLocation: {
    type: locationDetailSchema,
    required: true
  },
  checkOutLocation: {
    type: locationDetailSchema
  },
  duration: Number, // in minutes
  distance: Number, // in kilometers (between check-in and check-out)
  notes: String,
  purpose: String,
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  // Additional fields for better tracking
  deviceInfo: {
    platform: String, // iOS, Android
    appVersion: String,
    deviceModel: String
  },
  networkInfo: {
    connectionType: String, // wifi, cellular
    signalStrength: Number
  }
}, {
  timestamps: true
});

// Indexes for location queries
checkInSchema.index({ 'checkInLocation.latitude': 1, 'checkInLocation.longitude': 1 });
checkInSchema.index({ user: 1, checkInTime: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);