const express = require('express');
const Enquiry = require('../models/Enquiry');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper function to check if ID is a valid MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Get all enquiries
router.get('/', auth, async (req, res) => {
  try {
    const { status, customer, search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const enquiries = await Enquiry.find(query)
      .populate('customer', 'name contactPerson phone email')
      .populate('createdBy', 'name')
      .populate('products.product', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enquiry.countDocuments(query);

    res.json({
      success: true,
      enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enquiries',
      error: error.message
    });
  }
});

// Get enquiry by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name email')
      .populate('products.product');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      enquiry
    });
  } catch (error) {
    console.error('Get enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enquiry',
      error: error.message
    });
  }
});

// Create new enquiry
router.post('/', auth, async (req, res) => {
  try {
    const { customer, products, followUpDate, notes, subtotal, taxAmount, grandTotal } = req.body;

    console.log('Creating enquiry with data:', { 
      customer, 
      productsCount: products?.length,
      hasSubtotal: !!subtotal 
    });

    // Get customer details
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate products array
    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product is required'
      });
    }

    // Process products
    let calculatedSubtotal = 0;
    let calculatedTaxAmount = 0;
    const enquiryProducts = [];

    for (const item of products) {
      try {
        const isManualProduct = !isValidObjectId(item.product);
        
        let productName = item.name;
        let productRate = parseFloat(item.rate) || 0;
        let productTax = parseFloat(item.tax) || 0;
        let productQuantity = parseInt(item.quantity) || 1;
        
        if (isManualProduct) {
          console.log('Processing manual product:', item.name);
          if (!productName || productRate <= 0) {
            console.warn('Invalid manual product data:', item);
            continue;
          }
        } else {
          const dbProduct = await Product.findById(item.product);
          if (dbProduct) {
            productName = dbProduct.name;
            productRate = parseFloat(item.rate) || dbProduct.rate || 0;
            productTax = parseFloat(item.tax) || dbProduct.tax || 0;
          } else {
            console.warn('Database product not found:', item.product);
            continue;
          }
        }
        
        const lineTotal = productRate * productQuantity;
        const lineTax = (lineTotal * productTax) / 100;
        
        enquiryProducts.push({
          product: item.product,
          name: productName,
          quantity: productQuantity,
          rate: productRate,
          tax: productTax,
          total: lineTotal,
          isManual: isManualProduct
        });

        calculatedSubtotal += lineTotal;
        calculatedTaxAmount += lineTax;
      } catch (productError) {
        console.error('Error processing product:', productError);
        continue;
      }
    }

    if (enquiryProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found'
      });
    }

    const finalSubtotal = subtotal || calculatedSubtotal;
    const finalTaxAmount = taxAmount || calculatedTaxAmount;
    const finalGrandTotal = grandTotal || (finalSubtotal + finalTaxAmount);

    console.log('Final totals:', {
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      grandTotal: finalGrandTotal,
      productsCount: enquiryProducts.length
    });

    // Create enquiry
    const enquiry = new Enquiry({
      customer,
      customerName: customerDoc.name,
      products: enquiryProducts,
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      grandTotal: finalGrandTotal,
      followUpDate: followUpDate || new Date(Date.now() + 86400000),
      notes: notes || '',
      createdBy: req.userId
    });

    await enquiry.save();
    await enquiry.populate('customer', 'name contactPerson phone email');
    await enquiry.populate('createdBy', 'name');

    console.log('✅ Enquiry created successfully:', enquiry._id);

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      enquiry
    });

  } catch (error) {
    console.error('❌ Create enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enquiry',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update enquiry - COMPLETELY FIXED
// Update enquiry - SIMPLIFIED to handle all product types (same as orders)
router.put('/:id', auth, async (req, res) => {
  try {
    const { products, followUpDate, notes, status, subtotal, taxAmount, grandTotal } = req.body;

    console.log('🔄 Updating enquiry:', req.params.id);

    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Update products if provided
    if (products && Array.isArray(products) && products.length > 0) {
      console.log('📦 Processing products:', products.length);
      
      let calculatedSubtotal = 0;
      let calculatedTaxAmount = 0;
      const enquiryProducts = [];

      for (let i = 0; i < products.length; i++) {
        const item = products[i];

        // Simple validation - just check if essential fields exist
        const productName = item.name?.trim();
        const productRate = parseFloat(item.rate) || 0;
        const productTax = parseFloat(item.tax) || 0;
        const productQuantity = parseInt(item.quantity) || 1;
        
        if (!productName || productRate <= 0) {
          console.warn(`⚠️ Skipping product ${i}: missing name or invalid rate`);
          continue;
        }
        
        const lineTotal = productRate * productQuantity;
        const lineTax = (lineTotal * productTax) / 100;
        
        // Accept the product as-is (don't try to look up in database)
        enquiryProducts.push({
          product: item.product,
          name: productName,
          quantity: productQuantity,
          rate: productRate,
          tax: productTax,
          total: lineTotal,
          isManual: true // Mark all as manual during updates for simplicity
        });

        calculatedSubtotal += lineTotal;
        calculatedTaxAmount += lineTax;
        
        console.log(`  ✅ Product ${i} added: ${productName}`);
      }

      if (enquiryProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid products found. Please check product details.'
        });
      }

      console.log(`✅ Processed ${enquiryProducts.length}/${products.length} products`);

      enquiry.products = enquiryProducts;
      enquiry.subtotal = subtotal || calculatedSubtotal;
      enquiry.taxAmount = taxAmount || calculatedTaxAmount;
      enquiry.grandTotal = grandTotal || (enquiry.subtotal + enquiry.taxAmount);
    }

    // Update other fields
    if (followUpDate) {
      enquiry.followUpDate = new Date(followUpDate);
      console.log('📅 Updated follow-up date');
    }
    if (notes !== undefined) {
      enquiry.notes = notes;
      console.log('📝 Updated notes');
    }
    if (status) {
      enquiry.status = status;
      console.log('🔄 Updated status');
    }

    await enquiry.save();
    await enquiry.populate('customer', 'name contactPerson phone email');
    await enquiry.populate('createdBy', 'name');

    console.log('✅ Enquiry updated successfully');

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry
    });
  } catch (error) {
    console.error('❌ Update enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enquiry',
      error: error.message
    });
  }
});

// Convert enquiry to order
router.post('/:id/convert', auth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('customer');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    if (enquiry.status === 'order done') {
      return res.status(400).json({
        success: false,
        message: 'Enquiry already converted to order'
      });
    }

    const order = new Order({
      customer: enquiry.customer._id,
      customerName: enquiry.customerName,
      products: enquiry.products,
      subtotal: enquiry.subtotal,
      taxAmount: enquiry.taxAmount,
      totalAmount: enquiry.grandTotal,
      createdBy: req.userId,
      enquiry: enquiry._id,
      notes: enquiry.notes
    });

    await order.save();

    enquiry.status = 'order done';
    enquiry.convertedToOrder = order._id;
    await enquiry.save();

    await Customer.findByIdAndUpdate(enquiry.customer._id, {
      $inc: { 
        totalOrders: 1,
        totalRevenue: enquiry.grandTotal
      }
    });

    res.json({
      success: true,
      message: 'Enquiry converted to order successfully',
      order
    });
  } catch (error) {
    console.error('Convert enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert enquiry to order',
      error: error.message
    });
  }
});

// Delete enquiry
router.delete('/:id', auth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    console.log('✅ Enquiry deleted successfully');

    res.json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enquiry',
      error: error.message
    });
  }
});

module.exports = router;