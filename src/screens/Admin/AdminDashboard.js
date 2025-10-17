// src/screens/Admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { Users, Calendar, CheckCircle, FileText, LogOut, UserPlus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDashboard = ({ navigation }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingLeaves: 0,
    activeUsers: 0
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData);
      setAdminUser(user);

      // Load stats (you can call API here)
      // For now using dummy data
      setStats({
        totalUsers: 24,
        pendingLeaves: 5,
        activeUsers: 18
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const StatCard = ({ icon: Icon, title, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statContent}>
        <View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Icon size={40} color={color} style={{ opacity: 0.8 }} />
      </View>
    </TouchableOpacity>
  );

  const MenuButton = ({ icon: Icon, title, onPress, color }) => (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: color + '20' }]}>
        <Icon size={28} color={color} />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.adminName}>{adminUser?.name || 'Admin'}</Text>
            <Text style={styles.role}>Administrator</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon={Users}
            title="Total Users"
            value={stats.totalUsers}
            color="#3B82F6"
            onPress={() => navigation.navigate('AllUsers')}
          />
          <StatCard
            icon={Calendar}
            title="Pending Leaves"
            value={stats.pendingLeaves}
            color="#F59E0B"
            onPress={() => navigation.navigate('LeaveApprovals')}
          />
          <StatCard
            icon={CheckCircle}
            title="Active Users"
            value={stats.activeUsers}
            color="#10B981"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.menuGrid}>
            <MenuButton
              icon={UserPlus}
              title="Add New User"
              color="#3B82F6"
              onPress={() => navigation.navigate('AddUser')}
            />
            <MenuButton
              icon={Users}
              title="All Users"
              color="#8B5CF6"
              onPress={() => navigation.navigate('AllUsers')}
            />
            <MenuButton
              icon={Calendar}
              title="Leave Approvals"
              color="#F59E0B"
              onPress={() => navigation.navigate('LeaveApprovals')}
            />
            <MenuButton
              icon={FileText}
              title="Reports"
              color="#10B981"
              onPress={() => Alert.alert('Coming Soon', 'Reports feature coming soon!')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    padding: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});

export default AdminDashboard;