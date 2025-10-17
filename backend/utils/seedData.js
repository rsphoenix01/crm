const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Enquiry = require('../models/Enquiry');
const Order = require('../models/Order');
const Task = require('../models/Task');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldsalescrm')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Enquiry.deleteMany({}),
      Order.deleteMany({}),
      Task.deleteMany({})
    ]);

    console.log('🗑️  Cleared existing data');

    // Create Users
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@crm.com',
        password: 'admin123',
        phone: '+91 9876543210',
        role: 'admin'
      },
      {
        name: 'Sales Manager',
        email: 'manager@crm.com',
        password: 'manager123',
        phone: '+91 9876543211',
        role: 'manager'
      },
      {
        name: 'John Executive',
        email: 'john@crm.com',
        password: 'john123',
        phone: '+91 9876543212',
        role: 'executive'
      },
      {
        name: 'Jane Executive',
        email: 'jane@crm.com',
        password: 'jane123',
        phone: '+91 9876543213',
        role: 'executive'
      },
      {
        name: 'Mike Executive',
        email: 'mike@crm.com',
        password: 'mike123',
        phone: '+91 9876543214',
        role: 'executive'
      }
    ]);

    console.log('👥 Created users');

    // Create Products
    const products = await Product.create([
      {
        name: 'Enterprise Software License',
        description: 'Annual enterprise software license',
        category: 'Software',
        rate: 50000,
        tax: 18,
        unit: 'license'
      },
      {
        name: 'Professional Services',
        description: 'Consulting and implementation services',
        category: 'Services',
        rate: 2000,
        tax: 18,
        unit: 'hour'
      },
      {
        name: 'Hardware Server',
        description: 'Enterprise grade server hardware',
        category: 'Hardware',
        rate: 150000,
        tax: 18,
        unit: 'piece'
      },
      {
        name: 'Support Package',
        description: '24/7 technical support package',
        category: 'Support',
        rate: 10000,
        tax: 18,
        unit: 'month'
      },
      {
        name: 'Training Program',
        description: 'Staff training and certification program',
        category: 'Training',
        rate: 25000,
        tax: 18,
        unit: 'program'
      }
    ]);

    console.log('📦 Created products');

    // Create Customers
    const customers = await Customer.create([
      {
        name: 'Tech Solutions Pvt Ltd',
        contactPerson: 'Rajesh Kumar',
        phone: '+91 9876543220',
        email: 'rajesh@techsolutions.com',
        address: 'Plot 123, Hi-Tech City, Hyderabad - 500081',
        gst: '36ABCDE1234F1Z5',
        location: {
          latitude: 17.4485,
          longitude: 78.3908
        },
        status: 'active',
        followUpDate: new Date(Date.now() + 86400000),
        createdBy: users[2]._id
      },
      {
        name: 'Global Enterprises Ltd',
        contactPerson: 'Priya Sharma',
        phone: '+91 9876543221',
        email: 'priya@globalent.com',
        address: 'Tower A, Financial District, Hyderabad - 500032',
        gst: '36FGHIJ5678K2Z6',
        location: {
          latitude: 17.4239,
          longitude: 78.4738
        },
        status: 'active',
        followUpDate: new Date(Date.now() + 172800000),
        createdBy: users[3]._id
      },
      {
        name: 'Innovation Labs Inc',
        contactPerson: 'Amit Patel',
        phone: '+91 9876543222',
        email: 'amit@innovationlabs.com',
        address: 'Phase 2, HITEC City, Hyderabad - 500081',
        gst: '36KLMNO9012P3Z7',
        location: {
          latitude: 17.4504,
          longitude: 78.3808
        },
        status: 'potential',
        followUpDate: new Date(Date.now() + 259200000),
        createdBy: users[4]._id
      },
      {
        name: 'Digital Dynamics Corp',
        contactPerson: 'Sneha Reddy',
        phone: '+91 9876543223',
        email: 'sneha@digitaldynamics.com',
        address: 'Cyber Towers, Madhapur, Hyderabad - 500081',
        gst: '36QRSTU3456V4Z8',
        location: {
          latitude: 17.4475,
          longitude: 78.3915
        },
        status: 'active',
        followUpDate: new Date(Date.now() - 86400000), // Overdue
        createdBy: users[2]._id
      }
    ]);

    console.log('🏢 Created customers');

    // Create Enquiries
    const enquiries = await Enquiry.create([
      {
        customer: customers[0]._id,
        customerName: customers[0].name,
        products: [
          {
            product: products[0]._id,
            name: products[0].name,
            quantity: 5,
            rate: products[0].rate,
            tax: products[0].tax,
            total: 250000
          },
          {
            product: products[1]._id,
            name: products[1].name,
            quantity: 100,
            rate: products[1].rate,
            tax: products[1].tax,
            total: 200000
          }
        ],
        subtotal: 450000,
        taxAmount: 81000,
        grandTotal: 531000,
        followUpDate: new Date(Date.now() + 86400000),
        notes: 'Interested in enterprise package with professional services',
        status: 'quoted',
        createdBy: users[2]._id
      },
      {
        customer: customers[1]._id,
        customerName: customers[1].name,
        products: [
          {
            product: products[2]._id,
            name: products[2].name,
            quantity: 2,
            rate: products[2].rate,
            tax: products[2].tax,
            total: 300000
          }
        ],
        subtotal: 300000,
        taxAmount: 54000,
        grandTotal: 354000,
        followUpDate: new Date(Date.now() + 172800000),
        notes: 'Needs hardware servers for new data center',
        status: 'pending',
        createdBy: users[3]._id
      }
    ]);

    console.log('📋 Created enquiries');

    // Create Orders
    const orders = await Order.create([
      {
        customer: customers[2]._id,
        customerName: customers[2].name,
        products: [
          {
            product: products[3]._id,
            name: products[3].name,
            quantity: 12,
            rate: products[3].rate,
            tax: products[3].tax,
            total: 120000
          },
          {
            product: products[4]._id,
            name: products[4].name,
            quantity: 2,
            rate: products[4].rate,
            tax: products[4].tax,
            total: 50000
          }
        ],
        subtotal: 170000,
        taxAmount: 30600,
        totalAmount: 200600,
        paidAmount: 100000,
        payments: [
          {
            amount: 100000,
            mode: 'online',
            reference: 'TXN123456789',
            date: new Date(Date.now() - 86400000),
            notes: 'Initial payment - 50%'
          }
        ],
        createdBy: users[4]._id,
        notes: 'Partial payment received, balance to be paid on delivery'
      }
    ]);

    console.log('📦 Created orders');

    // Create P2P Tasks
    const tasks = await Task.create([
      {
        title: 'Follow up with Tech Solutions',
        description: 'Call Rajesh Kumar to discuss the enterprise package proposal',
        priority: 'High',
        dueDate: new Date(Date.now() + 86400000),
        assignerId: users[1]._id, // Manager
        assigneeId: users[2]._id  // John
      },
      {
        title: 'Prepare Q4 sales presentation',
        description: 'Create presentation for quarterly business review',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 259200000),
        assignerId: users[2]._id, // John
        assigneeId: users[3]._id  // Jane
      },
      {
        title: 'Update CRM with new leads',
        description: 'Import and categorize leads from marketing campaign',
        priority: 'Low',
        dueDate: new Date(Date.now() + 432000000),
        assignerId: users[3]._id, // Jane
        assigneeId: users[4]._id, // Mike
        completed: true,
        completedAt: new Date(Date.now() - 3600000)
      },
      {
        title: 'Schedule client demo',
        description: 'Coordinate with Global Enterprises for product demonstration',
        priority: 'High',
        dueDate: new Date(Date.now() + 172800000),
        assignerId: users[4]._id, // Mike
        assigneeId: users[2]._id  // John
      },
      {
        title: 'Review pricing strategy',
        description: 'Analyze competitor pricing and update our rates',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 518400000),
        assignerId: users[0]._id, // Admin
        assigneeId: users[1]._id  // Manager
      }
    ]);

    console.log('✅ Created P2P tasks');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏢 Customers: ${customers.length}`);
    console.log(`📦 Products: ${products.length}`);
    console.log(`📋 Enquiries: ${enquiries.length}`);
    console.log(`🛒 Orders: ${orders.length}`);
    console.log(`✅ Tasks: ${tasks.length}`);

    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@crm.com / admin123');
    console.log('Manager: manager@crm.com / manager123');
    console.log('John: john@crm.com / john123');
    console.log('Jane: jane@crm.com / jane123');
    console.log('Mike: mike@crm.com / mike123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeding
seedData();