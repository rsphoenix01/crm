const mongoose = require('mongoose');

const enquiryProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  isManual: {
    type: Boolean,
    default: false
  }
});

const enquirySchema = new mongoose.Schema({
  enquiryNumber: {
    type: String,
    unique: true,
    sparse: true  // ADDED: Allow null values, prevent duplicate key error
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  products: {
    type: [enquiryProductSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one product is required'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  followUpDate: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'quoted', 'order done', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  convertedToOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  salesPersonLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// ADDED: Generate enquiry number before saving
enquirySchema.pre('save', async function(next) {
  if (this.isNew && !this.enquiryNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.enquiryNumber = `ENQ-${String(count + 1).padStart(4, '0')}`;
      console.log('✅ Generated enquiry number:', this.enquiryNumber);
    } catch (error) {
      console.error('Error generating enquiry number:', error);
      this.enquiryNumber = `ENQ-${Date.now()}`;
    }
  }

  // Verify grand total matches subtotal + tax
  const calculatedGrandTotal = this.subtotal + this.taxAmount;
  if (Math.abs(this.grandTotal - calculatedGrandTotal) > 0.01) {
    console.warn('Grand total mismatch:', {
      stored: this.grandTotal,
      calculated: calculatedGrandTotal
    });
  }
  next();
});

// Index for better performance
enquirySchema.index({ customer: 1, createdAt: -1 });
enquirySchema.index({ status: 1, followUpDate: 1 });
enquirySchema.index({ createdBy: 1, createdAt: -1 });

// Virtual for total calculation verification
enquirySchema.virtual('calculatedTotal').get(function() {
  return this.subtotal + this.taxAmount;
});

module.exports = mongoose.model('Enquiry', enquirySchema);