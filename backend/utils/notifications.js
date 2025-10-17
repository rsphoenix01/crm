// utils/notifications.js
const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Initialize Firebase Admin (do this in server.js)
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//   }),
// });

async function sendNotification(userId, title, body, data = {}) {
  try {
    // Save to database
    const notification = new Notification({
      user: userId,
      title,
      body,
      type: data.type,
      relatedId: data.taskId || data.orderId || data.leaveId
    });
    await notification.save();
    
    // Send push notification if user has FCM token
    const user = await User.findById(userId);
    if (user && user.fcmToken) {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          notificationId: notification._id.toString()
        },
        token: user.fcmToken,
      };
      
      try {
        await admin.messaging().send(message);
      } catch (error) {
        console.error('FCM send error:', error);
        // Remove invalid token
        if (error.code === 'messaging/invalid-registration-token') {
          user.fcmToken = null;
          await user.save();
        }
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Notification error:', error);
  }
}

module.exports = { sendNotification };