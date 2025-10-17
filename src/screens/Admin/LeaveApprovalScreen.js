// src/screens/Admin/LeaveApprovalsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Calendar, Check, XCircle } from 'lucide-react-native';
import ApiService from '../../services/ApiService';

const LeaveApprovalsScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState(null);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const response = await ApiService.apiCall('/leaves');
      if (response.success) {
        setLeaves(response.leaves || []);
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves();
  };

  const handleLeaveAction = async (leaveId, action) => {
    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Leave`,
      `Are you sure you want to ${action} this leave request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingLeaveId(leaveId);
            try {
              const response = await ApiService.apiCall(`/leaves/${leaveId}/${action}`, {
                method: 'PUT'
              });

              if (response.success) {
                Alert.alert('Success', `Leave ${action}d successfully!`);
                loadLeaves();
              } else {
                Alert.alert('Error', response.message || `Failed to ${action} leave`);
              }
            } catch (error) {
              console.error(`Error ${action}ing leave:`, error);
              Alert.alert('Error', `Failed to ${action} leave. Please try again.`);
            } finally {
              setProcessingLeaveId(null);
            }
          }
        }
      ]
    );
  };

  const renderLeaveItem = ({ item }) => {
    const isPending = item.status === 'Pending';
    const isProcessing = processingLeaveId === item._id;

    return (
      <View style={styles.leaveCard}>
        {/* User Info */}
        <View style={styles.leaveHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.userEmail}>{item.user.email}</Text>
          </View>
          {!isPending && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'Approved' ? '#D1FAE5' : '#FEE2E2' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'Approved' ? '#059669' : '#DC2626' }
              ]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>

        {/* Leave Details */}
        <View style={styles.leaveDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Leave Type:</Text>
            <View style={styles.leaveTypeBadge}>
              <Text style={styles.leaveTypeText}>{item.type}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()} ({item.days} days)
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason:</Text>
            <Text style={styles.detailValue}>{item.reason}</Text>
          </View>
        </View>

        {/* Action Buttons (only for pending leaves) */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleLeaveAction(item._id, 'approve')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleLeaveAction(item._id, 'reject')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <XCircle size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading leave requests...</Text>
      </View>
    );
  }

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const processedLeaves = leaves.filter(l => l.status !== 'Pending');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leave Approvals</Text>
        <Text style={styles.headerSubtitle}>
          {pendingLeaves.length} pending request{pendingLeaves.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={leaves}
        renderItem={renderLeaveItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No leave requests</Text>
          </View>
        }
      />
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaveDetails: {
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
  },
  leaveTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  leaveTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});

export default LeaveApprovalsScreen;