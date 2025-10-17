// 6. Update NotificationService.js for Expo Push Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  static async initialize() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      console.log('Push token:', token.data);
      
      // Send token to backend
      await ApiService.updateFCMToken(token.data);
      
      // Store locally
      await AsyncStorage.setItem('expoPushToken', token.data);
      
      // Listen for notifications
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Notification initialization error:', error);
    }
  }

  static setupNotificationListeners() {
    // Handle notifications when app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification clicks
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data.type === 'task') {
        // Navigate to tasks screen
        // You'll need to pass navigation reference
      } else if (data.type === 'order') {
        // Navigate to orders screen
      }
    });
  }

  static async showLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
  }

  static async scheduleNotification(title, body, date, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: date,
    });
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count) {
    return await Notifications.setBadgeCountAsync(count);
  }
}

export default NotificationService;
