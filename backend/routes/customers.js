// routes/customers.js - Enhanced with Map-based Location Support
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

// Helper function to validate coordinates
const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' && 
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude) &&
    isFinite(latitude) && isFinite(longitude)
  );
};

// Helper function to validate location object
const validateLocation = (location, fieldName = 'location') => {
  if (!location) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  if (!validateCoordinates(location.latitude, location.longitude)) {
    return { 
      isValid: false, 
      message: `${fieldName} must include valid latitude and longitude coordinates` 
    };
  }

  if (!location.address || location.address.trim() === '') {
    return { 
      isValid: false, 
      message: `${fieldName} must include an address` 
    };
  }

  // Validate capture method if provided
  const validCaptureMethods = [
    'manual_map_selection', 'manual_search', 'gps_current', 'gps_geocoded', 'imported'
  ];
  
  if (location.captureMethod && !validCaptureMethods.includes(location.captureMethod)) {
    return {
      isValid: false,
      message: `Invalid capture method. Must be one of: ${validCaptureMethods.join(', ')}`
    };
  }

  return { isValid: true };
};

// Get all customers with enhanced filtering and map data
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.territory) {
      filter.territory = req.query.territory;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // NEW: Filter by location capture method
    if (req.query.captureMethod) {
      filter['location.captureMethod'] = req.query.captureMethod;
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { 'location.address': searchRegex },
        { 'location.addressComponents.city': searchRegex }
      ];
    }

    // Location-based queries (nearby customers)
    if (req.query.nearBy && req.query.latitude && req.query.longitude) {
      const radius = parseFloat(req.query.nearBy) || 10; // Default 10km radius
      const lat = parseFloat(req.query.latitude);
      const lng = parseFloat(req.query.longitude);
      
      if (validateCoordinates(lat, lng)) {
        // Calculate bounding box for performance
        const earthRadius = 6371; // km
        const latRange = radius / earthRadius * (180 / Math.PI);
        const lngRange = radius / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);
        
        filter['location.latitude'] = {
          $gte: lat - latRange,
          $lte: lat + latRange
        };
        filter['location.longitude'] = {
          $gte: lng - lngRange,
          $lte: lng + lngRange
        };
      }
    }

    const customers = await Customer.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(filter);

    // NEW: Include location method statistics in response
    const locationStats = await Customer.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: '$location.captureMethod',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      locationStats: locationStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers',
      error: error.message
    });
  }
});
router.get('/', auth, async (req, res) => {
  try {
    const { 
      search, 
      status, 
      nearBy, 
      latitude, 
      longitude, 
      limit = 20, 
      page = 1,
      territory,
      category,
      priority
    } = req.query;

    let query = {};
    
    // ENHANCED SEARCH - Clean the search term first
    if (search) {
      const cleanedSearch = search.trim().replace(/\s+/g, ' ');
      console.log(`🔍 Searching for: "${cleanedSearch}"`);
      
      // Create multiple search patterns
      const searchRegex = new RegExp(cleanedSearch, 'i');
      const searchWords = cleanedSearch.split(' ').filter(word => word.length > 0);
      
      query.$or = [
        // Exact partial match
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        
        // Word-by-word search for names
        ...searchWords.map(word => ({
          name: new RegExp(word, 'i')
        })),
        ...searchWords.map(word => ({
          contactPerson: new RegExp(word, 'i')
        })),
        
        // Location searches
        { 'location.address': searchRegex },
        { address: searchRegex }
      ];

      // Special handling for phone number search
      const digitsOnly = cleanedSearch.replace(/[^\d]/g, '');
      if (digitsOnly.length > 0) {
        query.$or.push({ phone: new RegExp(digitsOnly, 'i') });
      }
    }

    // Apply other filters
    if (status) query.status = status;
    if (territory) query.territory = territory;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    console.log('🔎 MongoDB Query:', JSON.stringify(query, null, 2));

    // Execute the search
    const customers = await Customer.find(query)
      .populate('createdBy', 'name email')
      .sort({ 
        // Sort by relevance: exact name matches first, then by creation date
        name: 1,
        createdAt: -1 
      })
      .limit(parseInt(limit))
      .skip((page - 1) * parseInt(limit));

    const total = await Customer.countDocuments(query);

    console.log(`✅ Search results: ${customers.length}/${total} customers found`);
    
    // Log first few results for debugging
    if (customers.length > 0) {
      console.log('📄 First few results:');
      customers.slice(0, 3).forEach((customer, index) => {
        console.log(`   ${index + 1}. Name: "${customer.name}", Contact: "${customer.contactPerson}", Phone: "${customer.phone}"`);
      });
    }

    res.json({
      success: true,
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      debug: {
        searchTerm: search,
        cleanedSearch: search?.trim().replace(/\s+/g, ' '),
        queryType: search ? 'search' : 'filter',
        filtersApplied: { status, territory, category, priority }
      }
    });

  } catch (error) {
    console.error('❌ Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers',
      error: error.message
    });
  }
});


// Get customer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer',
      error: error.message
    });
  }
});

// Create new customer - ENHANCED with Map Location Support
router.post('/', auth, async (req, res) => {
  try {
    const { location, salesPersonLocation } = req.body;
    
    // Validate required fields
    if (!req.body.name || !req.body.phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required fields'
      });
    }

    // Enhanced location validation
    const locationValidation = validateLocation(location, 'Customer location');
    if (!locationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: locationValidation.message
      });
    }

    // Set default location capture method and enhance location data
    if (!location.captureMethod) {
      location.captureMethod = 'manual_map_selection'; // Default for new map-based system
    }
    
    // Set default confidence based on capture method
    if (!location.confidence) {
      switch (location.captureMethod) {
        case 'manual_map_selection':
          location.confidence = 0.9;
          break;
        case 'gps_current':
          location.confidence = 0.95;
          break;
        case 'manual_search':
          location.confidence = 0.7;
          break;
        default:
          location.confidence = 0.8;
      }
    }

    // Validate salesPersonLocation if provided
    if (salesPersonLocation && salesPersonLocation.latitude && salesPersonLocation.longitude) {
      const salesLocationValidation = validateLocation(salesPersonLocation, 'Sales person location');
      if (!salesLocationValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: salesLocationValidation.message
        });
      }
      
      // Set default capture method for salesperson location
      if (!salesPersonLocation.captureMethod) {
        salesPersonLocation.captureMethod = 'gps_current';
      }
    }

    const customerData = {
      ...req.body,
      createdBy: req.userId,
      location: {
        ...location,
        timestamp: location.timestamp || new Date(),
        validationStatus: 'verified' // Map selections are considered verified
      },
      salesPersonLocation: salesPersonLocation ? {
        ...salesPersonLocation,
        timestamp: salesPersonLocation.timestamp || new Date()
      } : undefined
    };

    const customer = new Customer(customerData);
    await customer.save();

    await customer.populate('createdBy', 'name email');

    // Enhanced logging with capture method
    const methodDisplay = customer.locationCaptureDisplay;
    console.log(`✅ Customer created: ${customer.name} at ${location.address} (${methodDisplay})`);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer,
      locationMethod: methodDisplay
    });
  } catch (error) {
    console.error('Create customer error:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Customer with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
});

// Update customer - ENHANCED with Map Location Support
router.put('/:id', auth, async (req, res) => {
  try {
    const { location } = req.body;

    // If location is being updated, validate it
    if (location) {
      const locationValidation = validateLocation(location, 'Customer location');
      if (!locationValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: locationValidation.message
        });
      }
      
      // Preserve or set capture method
      if (!location.captureMethod) {
        location.captureMethod = 'manual_map_selection';
      }
      
      // Update confidence and validation status for map selections
      if (location.captureMethod === 'manual_map_selection') {
        location.confidence = location.confidence || 0.9;
        location.validationStatus = 'verified';
      }
      
      // Update timestamp
      location.timestamp = new Date();
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Enhanced logging for location updates
    if (location) {
      const methodDisplay = customer.locationCaptureDisplay;
      console.log(`📍 Customer location updated: ${customer.name} - ${location.address} (${methodDisplay})`);
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer,
      locationMethod: customer.locationCaptureDisplay
    });
  } catch (error) {
    console.error('Update customer error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
});

// Delete customer
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    console.log(`🗑️ Customer deleted: ${customer.name}`);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
});

// NEW: Get location capture method statistics
router.get('/analytics/location-methods', auth, async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: '$location.captureMethod',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$location.confidence' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const methodDisplayNames = {
      'manual_map_selection': 'Map Selection',
      'manual_search': 'Address Search', 
      'gps_current': 'Current GPS',
      'gps_geocoded': 'GPS + Geocoded',
      'imported': 'Data Import'
    };

    const formattedStats = stats.map(stat => ({
      method: stat._id,
      displayName: methodDisplayNames[stat._id] || stat._id,
      count: stat.count,
      avgConfidence: Math.round((stat.avgConfidence || 0) * 100) / 100
    }));

    res.json({
      success: true,
      locationMethodStats: formattedStats
    });
  } catch (error) {
    console.error('Location analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location analytics',
      error: error.message
    });
  }
});

module.exports = router;