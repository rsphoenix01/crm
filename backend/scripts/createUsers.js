// backend/scripts/createUsers.js
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldsalescrm')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function createUsers() {
  try {
    console.log('👥 Creating users...\n');

    // Define users to create
    const usersToCreate = [
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
      }
    ];

    // Create each user (skip if already exists)
    for (const userData of usersToCreate) {
      try {
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
        } else {
          const user = new User(userData);
          await user.save();
          console.log(`✅ Created: ${userData.name} (${userData.email}) - Role: ${userData.role}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${userData.email}:`, error.message);
      }
    }

    console.log('\n🎉 User creation completed!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:     admin@crm.com     / admin123');
    console.log('Manager:   manager@crm.com   / manager123');
    console.log('John:      john@crm.com      / john123');
    console.log('Jane:      jane@crm.com      / jane123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUsers();