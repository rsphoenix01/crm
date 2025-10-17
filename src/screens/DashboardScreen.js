// DashboardScreen.js - Complete Fixed Version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../utils/ApiService';

// Move component definitions outside of the main component
const QuickActionButton = ({ icon, title, onPress, color = '#007AFF' }) => (
  <TouchableOpacity style={[styles.quickAction, { backgroundColor: color }]} onPress={onPress}>
    <Icon name={icon} size={28} color="white" />
    <Text style={styles.quickActionText}>{title}</Text>
  </TouchableOpacity>
);

const StatCard = ({ title, value, icon, color = '#007AFF', loading = false }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statContent}>
      <Text style={styles.statTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
    </View>
    <Icon name={icon} size={40} color={color} />
  </View>
);

export default function DashboardScreen({ navigation }) {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dutyInfo, setDutyInfo] = useState({
    totalSessions: 0,
    totalHours: 0,
    currentSession: null
  });
  const [stats, setStats] = useState({
    totalCustomers: 0,
    pendingEnquiries: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check duty status on load
  useEffect(() => {
    checkDutyStatusOnLoad();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Add focus listener to reload when returning to dashboard
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
      checkDutyStatusOnLoad();
    });
    return unsubscribe;
  }, [navigation]);

  const checkDutyStatusOnLoad = async () => {
    try {
      console.log('🔍 Checking duty status from database...');
      setIsSyncing(true);
      
      const response = await ApiService.getDutyStatus();
      
      console.log('📊 Duty status response:', response);
      
      if (response.success) {
        const dbDutyStatus = response.isOnDuty || false;
        
        console.log(`Database says duty is: ${dbDutyStatus ? 'ON' : 'OFF'}`);
        
        // Just sync the UI - DON'T trigger any duty actions
        setIsOnDuty(dbDutyStatus);
        await AsyncStorage.setItem('dutyStatus', dbDutyStatus.toString());
        
        if (dbDutyStatus && response.currentSession) {
          console.log('✅ Synced: Duty is active');
          setDutyInfo({
            totalSessions: response.totalSessions || 0,
            totalHours: response.totalHours || 0,
            currentSession: response.currentSession
          });
        } else {
          console.log('✅ Synced: Duty is inactive');
        }
      }
    } catch (error) {
      console.error('Error checking duty status:', error);
      
      // On error, just use local storage - don't trigger any actions
      const storedStatus = await AsyncStorage.getItem('dutyStatus');
      setIsOnDuty(storedStatus === 'true');
    } finally {
      setTimeout(() => setIsSyncing(false), 500); // Small delay to prevent immediate trigger
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      
      // Load stats in parallel
      await Promise.all([
        loadTotalCustomers(),
        loadPendingEnquiries(),
        loadTotalOrders(),
        loadTotalRevenue()
      ]);
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await checkDutyStatusOnLoad();
    setRefreshing(false);
  };

  const loadTotalCustomers = async () => {
    try {
      const response = await ApiService.getCustomers();
      if (response.success) {
        setStats(prev => ({
          ...prev,
          totalCustomers: response.customers?.length || 0
        }));
        console.log(`📊 Total customers: ${response.customers?.length || 0}`);
      }
    } catch (error) {
      console.error('Error loading total customers:', error);
      setStats(prev => ({ ...prev, totalCustomers: 0 }));
    }
  };

  const loadPendingEnquiries = async () => {
    try {
      const response = await ApiService.getEnquiries({ status: 'pending' });
      if (response.success) {
        setStats(prev => ({
          ...prev,
          pendingEnquiries: response.enquiries?.length || 0
        }));
        console.log(`📊 Pending enquiries: ${response.enquiries?.length || 0}`);
      }
    } catch (error) {
      console.error('Error loading pending enquiries:', error);
      setStats(prev => ({ ...prev, pendingEnquiries: 0 }));
    }
  };

  const loadTotalOrders = async () => {
    try {
      const response = await ApiService.getOrders();
      if (response.success) {
        setStats(prev => ({
          ...prev,
          totalOrders: response.orders?.length || 0
        }));
        console.log(`📊 Total orders: ${response.orders?.length || 0}`);
      }
    } catch (error) {
      console.error('Error loading total orders:', error);
      setStats(prev => ({ ...prev, totalOrders: 0 }));
    }
  };

  const loadTotalRevenue = async () => {
    try {
      const response = await ApiService.getOrders();
      if (response.success && response.orders) {
        const totalRevenue = response.orders.reduce((sum, order) => {
          return sum + (order.totalAmount || order.grandTotal || 0);
        }, 0);
        setStats(prev => ({
          ...prev,
          totalRevenue: totalRevenue
        }));
        console.log(`📊 Total revenue: ${totalRevenue}`);
      }
    } catch (error) {
      console.error('Error loading total revenue:', error);
      setStats(prev => ({ ...prev, totalRevenue: 0 }));
    }
  };
  useEffect(() => {
    // One-time sync to fix stuck status
    const syncStatus = async () => {
      try {
        await ApiService.syncDutyStatus();
        console.log('✅ Status synced');
        checkDutyStatusOnLoad();
      } catch (error) {
        console.error('Sync error:', error);
      }
    };
    
    syncStatus();
  }, []);

  const toggleDutyStatus = async (newStatus) => {
    if (isSyncing) {
      console.log('⚠️ Ignoring toggle - currently syncing');
      return;
    }

    console.log(`👤 User manually toggled duty to: ${newStatus ? 'ON' : 'OFF'}`);

    if (newStatus) {
      // Starting duty
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location access is needed to mark duty start.');
          return;
        }
  
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
  
        const addressArray = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
  
        const addr = addressArray[0];
        const fullAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
  
        const response = await ApiService.markAttendance({
          action: 'start',
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: fullAddress || 'Address not available',
            city: addr.city || '',
            state: addr.region || '',
            pincode: addr.postalCode || '',
            addressComponents: {
              city: addr.city || '',
              state: addr.region || '',
              pincode: addr.postalCode || '',
              country: addr.country || ''
            },
            captureMethod: 'gps',
            timestamp: new Date().toISOString()
          }
        });
  
        if (response.success) {
          setIsOnDuty(true);
          await AsyncStorage.setItem('dutyStatus', 'true');
          Alert.alert('Duty Started', `Your duty session has started at ${addr.city || 'current location'}.`);
        }
        
      } catch (error) {
        console.error('Error starting duty:', error);
        
        if (error.message.includes('already have an active')) {
          setIsOnDuty(true);
          await AsyncStorage.setItem('dutyStatus', 'true');
          Alert.alert('Session Active', 'Your duty session is already running.');
        } else {
          Alert.alert('Error', 'Failed to start duty. Please try again.');
        }
      }
    } else {
      // Ending duty
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location access is needed to mark duty end.');
          return;
        }
  
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
  
        const addressArray = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
  
        const addr = addressArray[0];
        const fullAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
  
        const response = await ApiService.markAttendance({
          action: 'end',
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: fullAddress || 'Address not available',
            city: addr.city || '',
            state: addr.region || '',
            pincode: addr.postalCode || '',
            addressComponents: {
              city: addr.city || '',
              state: addr.region || '',
              pincode: addr.postalCode || '',
              country: addr.country || ''
            },
            captureMethod: 'gps',
            timestamp: new Date().toISOString()
          }
        });
  
        if (response.success) {
          setIsOnDuty(false);
          await AsyncStorage.setItem('dutyStatus', 'false');
          const duration = response.completedSession?.duration || 0;
          Alert.alert('Duty Ended', `Session ended at ${addr.city || 'current location'}. Duration: ${duration.toFixed(1)} hours`);
        }
        
      } catch (error) {
        console.error('Error ending duty:', error);
        Alert.alert('Error', 'Failed to end duty. Please try again.');
      }
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.dutyContainer}>
          <View style={styles.dutyInfo}>
            <Text style={styles.dutyText}>
              Duty Status: {isOnDuty ? 'ON' : 'OFF'}
            </Text>
            <Text style={styles.dutySubText}>
              {isOnDuty ? 'Currently on duty' : 'Not on duty'}
            </Text>
          </View>
          <Switch
            value={isOnDuty}
            disabled={isSyncing}
            onValueChange={(newValue) => {
              if (!isSyncing) {
                toggleDutyStatus(newValue);
              }
            }}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isOnDuty ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-circle" size={32} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <StatCard 
          title="Total Customers" 
          value={stats.totalCustomers} 
          icon="people" 
          color="#4CAF50"
          loading={loading}
        />
        <StatCard 
          title="Pending Enquiries" 
          value={stats.pendingEnquiries} 
          icon="pending" 
          color="#FF9800"
          loading={loading}
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon="shopping-cart" 
          color="#2196F3"
          loading={loading}
        />
        <StatCard 
          title="Revenue (₹)" 
          value={stats.totalRevenue.toLocaleString()} 
          icon="attach-money" 
          color="#9C27B0"
          loading={loading}
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionButton 
          icon="person-add" 
          title="New Customer" 
          onPress={() => navigation.navigate('AddCustomer')}
          color="#4CAF50"
        />
        <QuickActionButton 
          icon="add-shopping-cart" 
          title="New Enquiry" 
          onPress={() => navigation.navigate('AddEnquiry')}
          color="#FF9800"
        />
        <QuickActionButton 
          icon="shopping-cart" 
          title="New Order" 
          onPress={() => navigation.navigate('AddOrder')}
          color="#2196F3"
        />
        <QuickActionButton 
          icon="assessment" 
          title="Reports" 
          onPress={() => navigation.navigate('Reports')}
          color="#9C27B0"
        />
      </View>

      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.quickStatsRow}>
          <TouchableOpacity 
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Customers')}
          >
            <Icon name="people" size={24} color="#4CAF50" />
            <Text style={styles.quickStatValue}>{stats.totalCustomers}</Text>
            <Text style={styles.quickStatLabel}>Customers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Enquiries')}
          >
            <Icon name="question-answer" size={24} color="#FF9800" />
            <Text style={styles.quickStatValue}>{stats.pendingEnquiries}</Text>
            <Text style={styles.quickStatLabel}>Pending</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Orders')}
          >
            <Icon name="shopping-cart" size={24} color="#2196F3" />
            <Text style={styles.quickStatValue}>{stats.totalOrders}</Text>
            <Text style={styles.quickStatLabel}>Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dutyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dutyInfo: {
    flex: 1,
    marginRight: 10,
  },
  dutyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dutySubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
    color: '#333',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  quickStatsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});