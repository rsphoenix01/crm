const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: String,
  rate: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 18
  },
  unit: {
    type: String,
    default: 'piece'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);