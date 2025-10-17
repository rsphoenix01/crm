// utils/OfflineSync.js
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

class OfflineSync {
  static async initialize() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncPendingData();
      }
    });
  }

  static async saveOfflineData(type, data) {
    try {
      const pendingData = await AsyncStorage.getItem('pendingSync');
      const pending = pendingData ? JSON.parse(pendingData) : [];
      
      pending.push({
        id: Date.now().toString(),
        type,
        data,
        timestamp: new Date().toISOString(),
      });

      await AsyncStorage.setItem('pendingSync', JSON.stringify(pending));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  static async syncPendingData() {
    try {
      const pendingData = await AsyncStorage.getItem('pendingSync');
      if (!pendingData) return;

      const pending = JSON.parse(pendingData);
      const synced = [];

      for (const item of pending) {
        try {
          switch (item.type) {
            case 'customer':
              await ApiService.createCustomer(item.data);
              break;
            case 'enquiry':
              await ApiService.createEnquiry(item.data);
              break;
            case 'order':
              await ApiService.createOrder(item.data);
              break;
            case 'checkin':
              await ApiService.checkIn(item.data);
              break;
            case 'checkout':
              await ApiService.checkOut(item.data);
              break;
          }
          synced.push(item.id);
        } catch (error) {
          console.error(`Error syncing ${item.type}:`, error);
        }
      }

      // Remove synced items
      const remaining = pending.filter(item => !synced.includes(item.id));
      await AsyncStorage.setItem('pendingSync', JSON.stringify(remaining));

      if (synced.length > 0) {
        NotificationService.showLocalNotification(
          'Sync Complete',
          `${synced.length} items synced successfully`
        );
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }
}

export default OfflineSync;
