const mongoose = require('mongoose');

const orderProductSchema = new mongoose.Schema({
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

const paymentSchema = new mongoose.Schema({
  amount: Number,
  mode: {
    type: String,
    enum: ['cash', 'online', 'cheque', 'card'],
    required: true
  },
  reference: String,
  date: {
    type: Date,
    default: Date.now
  },
  notes: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
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
    type: [orderProductSchema],
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
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  payments: [paymentSchema],
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'cancelled', 'delivered'],
    default: 'pending'
  },
  // ADDED: Optional delivery location (will be populated from customer)
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  deliveryDate: Date,
  deliveredDate: Date,
  notes: String,
  deliveryNotes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry'
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;
      console.log('✅ Generated order number:', this.orderNumber);
    } catch (error) {
      console.error('Error generating order number:', error);
      this.orderNumber = `ORD-${Date.now()}`;
    }
  }
  
  // Calculate balance amount
  this.balanceAmount = this.totalAmount - (this.paidAmount || 0);
  
  // Update status based on payment
  if (this.paidAmount === 0) {
    this.status = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  } else {
    this.status = 'partial';
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);