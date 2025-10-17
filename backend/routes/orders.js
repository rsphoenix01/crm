const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper function to check if ID is a valid MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Get all orders
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
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name contactPerson phone email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
});

// Create new order - UPDATED TO AUTO-POPULATE CUSTOMER LOCATION
router.post('/', auth, async (req, res) => {
  try {
    const { customer, products, deliveryDate, notes, subtotal, taxAmount, totalAmount } = req.body;

    console.log('Creating order with data:', { 
      customer, 
      productsCount: products?.length,
      hasSubtotal: !!subtotal 
    });

    // Get customer details WITH LOCATION
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }

    console.log('📍 Customer location:', customerDoc.location);

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
    const orderProducts = [];

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
        
        orderProducts.push({
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

    if (orderProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found'
      });
    }

    const finalSubtotal = subtotal || calculatedSubtotal;
    const finalTaxAmount = taxAmount || calculatedTaxAmount;
    const finalTotalAmount = totalAmount || (finalSubtotal + finalTaxAmount);

    console.log('Final totals:', {
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      totalAmount: finalTotalAmount,
      productsCount: orderProducts.length
    });

    // UPDATED: Prepare delivery location from customer
    let deliveryLocation = null;
    if (customerDoc.location) {
      deliveryLocation = {
        latitude: customerDoc.location.latitude,
        longitude: customerDoc.location.longitude,
        address: customerDoc.location.address || '',
        city: customerDoc.location.addressComponents?.city || '',
        state: customerDoc.location.addressComponents?.state || '',
        pincode: customerDoc.location.addressComponents?.pincode || ''
      };
      console.log('✅ Using customer location as delivery location');
    } else {
      console.warn('⚠️ Customer has no location stored');
    }

    // Create order
    const order = new Order({
      customer,
      customerName: customerDoc.name,
      products: orderProducts,
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      totalAmount: finalTotalAmount,
      balanceAmount: finalTotalAmount,
      deliveryLocation: deliveryLocation, // ADDED: Auto-populate from customer
      deliveryDate: deliveryDate || null,
      notes: notes || '',
      createdBy: req.userId,
      status: 'pending'
    });

    await order.save();
    await order.populate('customer', 'name contactPerson phone email');
    await order.populate('createdBy', 'name');

    // Update customer stats
    await Customer.findByIdAndUpdate(customer, {
      $inc: { 
        totalOrders: 1,
        totalRevenue: finalTotalAmount
      }
    });

    console.log('✅ Order created successfully:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update order - SAME AS ENQUIRY
// Update order - SIMPLIFIED to handle all product types
router.put('/:id', auth, async (req, res) => {
  try {
    const { products, deliveryDate, notes, status, subtotal, taxAmount, totalAmount } = req.body;

    console.log('🔄 Updating order:', req.params.id);

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update products if provided
    if (products && Array.isArray(products) && products.length > 0) {
      console.log('📦 Processing products:', products.length);
      
      let calculatedSubtotal = 0;
      let calculatedTaxAmount = 0;
      const orderProducts = [];

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
        orderProducts.push({
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

      if (orderProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid products found. Please check product details.'
        });
      }

      console.log(`✅ Processed ${orderProducts.length}/${products.length} products`);

      order.products = orderProducts;
      order.subtotal = subtotal || calculatedSubtotal;
      order.taxAmount = taxAmount || calculatedTaxAmount;
      order.totalAmount = totalAmount || (order.subtotal + order.taxAmount);
      order.balanceAmount = order.totalAmount - (order.paidAmount || 0);
    }

    // Update other fields
    if (deliveryDate) {
      order.deliveryDate = new Date(deliveryDate);
      console.log('📅 Updated delivery date');
    }
    if (notes !== undefined) {
      order.notes = notes;
      console.log('📝 Updated notes');
    }
    if (status) {
      order.status = status;
      console.log('🔄 Updated status');
    }

    await order.save();
    await order.populate('customer', 'name contactPerson phone email');
    await order.populate('createdBy', 'name');

    console.log('✅ Order updated successfully');

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('❌ Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
});

// Add payment to order
router.post('/:id/payments', auth, async (req, res) => {
  try {
    const { amount, mode, reference, notes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (amount <= 0 || amount > order.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    order.payments.push({
      amount,
      mode,
      reference,
      notes,
      date: new Date()
    });

    order.paidAmount += amount;

    await order.save();

    res.json({
      success: true,
      message: 'Payment added successfully',
      order
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment',
      error: error.message
    });
  }
});

// Delete order
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Order deleted successfully');

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
});

module.exports = router;