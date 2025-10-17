// src/screens/Admin/UserDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Clock, MapPin, FileText, DollarSign } from 'lucide-react-native';
import ApiService from '../../services/ApiService';

const UserDetailScreen = ({ route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    attendance: [],
    checkIns: [],
    orders: [],
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      totalCheckIns: 0
    }
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load attendance
      const attendanceResponse = await ApiService.apiCall(`/attendance?userId=${user._id}`);
      
      // Load check-ins
      const checkInsResponse = await ApiService.apiCall(`/checkins?userId=${user._id}`);
      
      // Load orders
      const ordersResponse = await ApiService.apiCall(`/orders?userId=${user._id}`);

      const orders = ordersResponse.orders || [];
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      setUserData({
        attendance: attendanceResponse.attendance || [],
        checkIns: checkInsResponse.checkIns || [],
        orders: orders,
        stats: {
          totalOrders: orders.length,
          totalRevenue: totalRevenue,
          totalCheckIns: (checkInsResponse.checkIns || []).length
        }
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.userDetails}>
            <Text style={styles.detailText}>Role: <Text style={styles.detailValue}>{user.role}</Text></Text>
            <Text style={styles.detailText}>Phone: <Text style={styles.detailValue}>{user.phone || 'N/A'}</Text></Text>
            <View style={[styles.statusBadge, { backgroundColor: user.dutyStatus ? '#D1FAE5' : '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: user.dutyStatus ? '#059669' : '#DC2626' }]}>
                {user.dutyStatus ? 'On Duty' : 'Off Duty'}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={FileText}
              label="Total Orders"
              value={userData.stats.totalOrders}
              color="#3B82F6"
            />
            <StatCard
              icon={DollarSign}
              label="Total Revenue"
              value={`₹${userData.stats.totalRevenue.toLocaleString()}`}
              color="#10B981"
            />
            <StatCard
              icon={MapPin}
              label="Check-ins"
              value={userData.stats.totalCheckIns}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Recent Attendance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          {userData.attendance.slice(0, 5).map((att, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Clock size={20} color="#6B7280" />
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>
                    {new Date(att.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {att.dutyStartTime ? new Date(att.dutyStartTime).toLocaleTimeString() : 'N/A'} - 
                    {att.dutyEndTime ? new Date(att.dutyEndTime).toLocaleTimeString() : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemValue}>{att.totalHours || 0}h</Text>
                <Text style={styles.listItemSubvalue}>{att.totalDistance || 0} km</Text>
              </View>
            </View>
          ))}
          {userData.attendance.length === 0 && (
            <Text style={styles.emptyText}>No attendance records</Text>
          )}
        </View>

        {/* Recent Check-ins */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Check-ins</Text>
          {userData.checkIns.slice(0, 5).map((checkIn) => (
            <View key={checkIn._id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <MapPin size={20} color="#6B7280" />
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>
                    {checkIn.customer?.name || 'General Check-in'}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {new Date(checkIn.checkInTime).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {userData.checkIns.length === 0 && (
            <Text style={styles.emptyText}>No check-ins</Text>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {userData.orders.slice(0, 5).map((order) => (
            <View key={order._id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <FileText size={20} color="#6B7280" />
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>
                    {order.customer?.name || 'N/A'}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemValue}>₹{order.totalAmount?.toLocaleString() || 0}</Text>
                <View style={[styles.orderStatusBadge, { backgroundColor: order.status === 'confirmed' ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={[styles.orderStatusText, { color: order.status === 'confirmed' ? '#059669' : '#D97706' }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {userData.orders.length === 0 && (
            <Text style={styles.emptyText}>No orders</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  userHeader: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  userDetails: {
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listItemSubvalue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
});

export default UserDetailScreen;