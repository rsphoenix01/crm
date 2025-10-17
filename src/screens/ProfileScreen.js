// src/screens/ProfileScreen.js - Updated with Admin Panel
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../utils/ApiService';

export default function ProfileScreen({ navigation, onLogout }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: true,
    locationTracking: true,
    autoSync: true,
  });

  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading user profile...');
      
      // Try API first
      try {
        const response = await ApiService.getUserProfile();
        if (response.success && response.user) {
          console.log('✅ User profile loaded:', response.user);
          setUserData(response.user);
          await AsyncStorage.setItem('userData', JSON.stringify(response.user));
          return;
        }
      } catch (apiError) {
        console.log('API failed, using AsyncStorage fallback');
      }

      // Fallback to AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Logging out...');
              
              // Call onLogout directly (NOT props.onLogout)
              if (onLogout) {
                await onLogout();
              }
              
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', `Failed to logout: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const toggleSetting = async (setting) => {
    const newSettings = {
      ...settings,
      [setting]: !settings[setting],
    };
    setSettings(newSettings);
    await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Icon name="account-circle" size={80} color="#007AFF" />
        <Text style={styles.userName}>{userData.name}</Text>
        <Text style={styles.userEmail}>{userData.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: userData.role === 'admin' ? '#FF3B30' : '#007AFF' }]}>
          <Text style={styles.roleText}>{userData.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoText}>{userData.phone || 'No phone added'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#666" />
          <Text style={styles.infoText}>{userData.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="work" size={20} color="#666" />
          <Text style={styles.infoText}>{userData.role || 'Executive'}</Text>
        </View>
      </View>

      {/* ADMIN PANEL - Show only for admin/manager */}
      {(userData.role === 'admin' || userData.role === 'manager') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Panel</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Icon name="people" size={20} color="#FF9500" />
            <Text style={styles.menuText}>Manage Users</Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="notifications" size={20} color="#666" />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={() => toggleSetting('notifications')}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.notifications ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="location-on" size={20} color="#666" />
            <Text style={styles.settingText}>Location Tracking</Text>
          </View>
          <Switch
            value={settings.locationTracking}
            onValueChange={() => toggleSetting('locationTracking')}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.locationTracking ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="sync" size={20} color="#666" />
            <Text style={styles.settingText}>Auto Sync</Text>
          </View>
          <Switch
            value={settings.autoSync}
            onValueChange={() => toggleSetting('autoSync')}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.autoSync ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="help" size={20} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Icon name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="info" size={20} color="#666" />
          <Text style={styles.menuText}>About</Text>
          <Icon name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 15,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 15,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
  },
});