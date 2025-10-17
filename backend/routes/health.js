const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    const customerCount = await Customer.countDocuments();
    
    res.json({
      success: true,
      server: 'online',
      database: dbStates[dbState],
      customerCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      database: 'error'
    });
  }
});

// Status endpoint with more details
router.get('/status', async (req, res) => {
  try {
    const customerCount = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: 'active' });
    
    // Get recent customers
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt');

    res.json({
      success: true,
      database: 'connected',
      collections: {
        customers: {
          total: customerCount,
          active: activeCustomers
        }
      },
      recentCustomers,
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;