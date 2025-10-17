// models/Customer.js - Updated to support map-based location capture
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
    validate: {
      validator: function(v) {
        return typeof v === 'number' && !isNaN(v) && isFinite(v);
      },
      message: 'Invalid latitude value'
    }
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
    validate: {
      validator: function(v) {
        return typeof v === 'number' && !isNaN(v) && isFinite(v);
      },
      message: 'Invalid longitude value'
    }
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 500
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 10000 // Maximum 10km accuracy
  },
  
  // Enhanced capture method tracking
  captureMethod: {
    type: String,
    enum: [
      'manual_map_selection',  // NEW: Selected from interactive map
      'manual_search',         // Searched by address text
      'gps_current',          // Current GPS location
      'gps_geocoded',         // GPS + reverse geocoded
      'imported'              // Data import
    ],
    default: 'manual_map_selection',
    required: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // NEW: Store map interaction details
  mapDetails: {
    zoomLevel: Number,
    searchQuery: String,  // If location was found via search
    userInteraction: {
      type: String,
      enum: ['tap', 'search', 'gps', 'drag'],
      default: 'tap'
    }
  },
  
  // NEW: Location validation confidence
  validationStatus: {
    type: String,
    enum: ['verified', 'unverified', 'approximate'],
    default: 'unverified'
  },
  
  // Store the original search query if applicable
  originalQuery: {
    type: String,
    trim: true
  },
  
  // NEW: Geocoding confidence score (0-1)
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8  // Default confidence for map selections
  },
  
  // Enhanced address components for better search/filtering
  addressComponents: {
    street: String,
    district: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    },
    // NEW: Additional components for Indian addresses
    landmark: String,
    area: String,
    subDistrict: String
  }
});

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  designation: String
});

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 2;
      },
      message: 'Customer name must be at least 2 characters long'
    }
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[0-9+\-\s\(\)]+$/.test(v) && v.replace(/[^0-9]/g, '').length >= 10;
      },
      message: 'Please enter a valid phone number with at least 10 digits'
    }
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  address: {
    type: String,
    trim: true
  },
  gst: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Please enter a valid GST number (15 characters)'
    }
  },
  notes: String,
  
  // Enhanced location field with map support
  location: {
    type: locationSchema,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.latitude && v.longitude && v.address;
      },
      message: 'Complete location with coordinates and address is required'
    }
  },
  
  // Where salesperson was when adding this customer (auto-captured for tracking)
  salesPersonLocation: {
    type: locationSchema
  },
  
  additionalContacts: [contactSchema],
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'potential', 'lead'],
    default: 'active',
    index: true
  },
  
  followUpDate: {
    type: Date,
    index: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  lastVisited: Date,
  
  // Analytics fields
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Customer categorization
  category: {
    type: String,
    enum: ['enterprise', 'sme', 'startup', 'individual', 'government'],
    default: 'sme',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
    index: true
  },
  
  territory: {
    type: String,
    trim: true,
    index: true
  },
  
  // Customer source tracking
  source: {
    type: String,
    enum: ['direct_visit', 'referral', 'cold_call', 'website', 'advertisement', 'social_media', 'other'],
    default: 'direct_visit'
  },
  
  industry: {
    type: String,
    trim: true
  },
  
  annualRevenue: {
    type: String,
    enum: ['under_1l', '1l_5l', '5l_25l', '25l_1cr', '1cr_5cr', '5cr_plus', 'unknown'],
    default: 'unknown'
  }
}, {
  timestamps: true
});

// Enhanced indexes for better performance including map-based queries
customerSchema.index({ 'location.latitude': 1, 'location.longitude': 1 }); // Geospatial queries
customerSchema.index({ createdBy: 1, createdAt: -1 }); // User's customers by date
customerSchema.index({ 'location.address': 'text', name: 'text', 'location.addressComponents.city': 'text' }); // Text search
customerSchema.index({ status: 1, followUpDate: 1 }); // Active customers with follow-ups
customerSchema.index({ territory: 1, status: 1 }); // Territory-based queries
customerSchema.index({ category: 1, priority: 1 }); // Filtering by category and priority
customerSchema.index({ 'location.addressComponents.city': 1 }); // City-based queries
customerSchema.index({ phone: 1 }, { 
  unique: true, 
  sparse: true,  // Allow null/undefined values
  partialFilterExpression: { phone: { $exists: true, $ne: null, $ne: "" } }
}); // Prevent duplicate phone numbers
customerSchema.index({ 'location.captureMethod': 1 }); // NEW: Query by capture method

// Compound index for complex queries
customerSchema.index({ 
  status: 1, 
  'location.addressComponents.city': 1, 
  category: 1 
});

// Virtual field for full display name
customerSchema.virtual('displayName').get(function() {
  return this.contactPerson ? `${this.name} (${this.contactPerson})` : this.name;
});

// NEW: Virtual field for location capture method display
customerSchema.virtual('locationCaptureDisplay').get(function() {
  const methodMap = {
    'manual_map_selection': 'Selected on Map',
    'manual_search': 'Address Search',
    'gps_current': 'Current GPS',
    'gps_geocoded': 'GPS + Geocoded',
    'imported': 'Data Import'
  };
  return methodMap[this.location?.captureMethod] || 'Unknown';
});

// Pre-save middleware for enhanced location processing
customerSchema.pre('save', async function(next) {
  // Enhanced address parsing with map context
  if (this.location && this.location.address && this.isModified('location')) {
    const address = this.location.address.toLowerCase();
    
    // Initialize address components if not set
    if (!this.location.addressComponents) {
      this.location.addressComponents = {};
    }
    
    // Enhanced city detection patterns for Indian cities
    const cityPatterns = {
      'hyderabad': 'Hyderabad',
      'secunderabad': 'Secunderabad',
      'bangalore': 'Bangalore',
      'bengaluru': 'Bangalore',
      'mumbai': 'Mumbai',
      'pune': 'Pune',
      'chennai': 'Chennai',
      'delhi': 'Delhi',
      'new delhi': 'New Delhi',
      'gurgaon': 'Gurgaon',
      'noida': 'Noida',
      'kolkata': 'Kolkata'
    };
    
    // Enhanced state patterns
    const statePatterns = {
      'telangana': 'Telangana',
      'andhra pradesh': 'Andhra Pradesh',
      'karnataka': 'Karnataka',
      'maharashtra': 'Maharashtra',
      'tamil nadu': 'Tamil Nadu',
      'delhi': 'Delhi',
      'haryana': 'Haryana',
      'uttar pradesh': 'Uttar Pradesh',
      'west bengal': 'West Bengal'
    };
    
    // Extract city
    for (const [pattern, city] of Object.entries(cityPatterns)) {
      if (address.includes(pattern)) {
        this.location.addressComponents.city = city;
        break;
      }
    }
    
    // Extract state
    for (const [pattern, state] of Object.entries(statePatterns)) {
      if (address.includes(pattern)) {
        this.location.addressComponents.state = state;
        break;
      }
    }
    
    // Enhanced area/district patterns for major cities
    const areaPatterns = [
      'hitech city', 'hi-tech city', 'banjara hills', 'jubilee hills', 
      'gachibowli', 'madhapur', 'kondapur', 'kukatpally', 'miyapur',
      'koramangala', 'indiranagar', 'whitefield', 'electronic city',
      'andheri', 'bandra', 'powai', 'lower parel', 'bkc'
    ];
    
    for (const area of areaPatterns) {
      if (address.includes(area)) {
        this.location.addressComponents.district = area.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        break;
      }
    }
    
    // Set higher confidence for map selections
    if (this.location.captureMethod === 'manual_map_selection') {
      this.location.confidence = this.location.confidence || 0.9;
      this.location.validationStatus = 'verified';
    }
  }
  
  // Auto-assign territory based on location if not set
  if (!this.territory && this.location && this.location.addressComponents.city) {
    const city = this.location.addressComponents.city.toLowerCase();
    if (city.includes('hyderabad') || city.includes('secunderabad')) {
      this.territory = 'Hyderabad';
    } else if (city.includes('bangalore')) {
      this.territory = 'Bangalore';
    } else if (city.includes('mumbai')) {
      this.territory = 'Mumbai';
    }
  }
  
  // Clean and format phone number
  if (this.phone) {
    this.phone = this.phone.replace(/[^\d+]/g, ''); // Keep only digits and +
  }
  
  // Set default capture method if not provided (for backward compatibility)
  if (this.location && !this.location.captureMethod) {
    this.location.captureMethod = this.isNew ? 'manual_map_selection' : 'imported';
  }
  
  next();
});

// Post-save middleware for enhanced logging
customerSchema.post('save', function(doc) {
  const methodDisplay = doc.locationCaptureDisplay;
  console.log(`✅ Customer saved: ${doc.name} at ${doc.location.address} (${methodDisplay})`);
});

// Add toJSON transform to include virtual fields
customerSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.id; // Remove duplicate id field
    return ret;
  }
});

module.exports = mongoose.model('Customer', customerSchema);