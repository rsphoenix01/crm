// backend/scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Update with your MongoDB connection string
mongoose.connect('mongodb://localhost:27017/field-sales-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@yourcompany.com' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists!');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new User({
      name: 'Admin',
      email: 'admin@yourcompany.com',
      password: hashedPassword,
      phone: '9999999999',
      role: 'admin'
    });
    
    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@yourcompany.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();