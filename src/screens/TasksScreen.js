// screens/TasksScreen.js - Updated with Backend Integration
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

// Import services
import ApiService from '../utils/ApiService';
import { socket } from '../../App';

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState('myTasks');
  const [myTasks, setMyTasks] = useState([]);
  const [assignedByMeTasks, setAssignedByMeTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Task creation modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'Medium',
    dueDate: new Date(),
  });

  // Travel log and leave states
  const [travelLog, setTravelLog] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Sick Leave',
    fromDate: new Date(),
    toDate: new Date(),
    reason: '',
  });

  useEffect(() => {
    initializeData();
    setupSocketListeners();

    return () => {
      if (socket) {
        socket.off('taskAssigned');
        socket.off('taskCompleted');
        socket.off('taskUpdated');
      }
    };
  }, []);

  const setupSocketListeners = () => {
    if (socket) {
      socket.on('taskAssigned', (data) => {
        if (data.task.assigneeId === currentUser?.id) {
          loadMyTasks(); // Refresh my tasks
        }
        if (data.task.assignerId === currentUser?.id) {
          loadAssignedByMeTasks(); // Refresh assigned by me
        }
      });

      socket.on('taskCompleted', (data) => {
        loadMyTasks();
        loadAssignedByMeTasks();
      });

      socket.on('taskUpdated', (data) => {
        loadMyTasks();
        loadAssignedByMeTasks();
      });
    }
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData);
      setCurrentUser(user);

      // Load all data
      await Promise.all([
        loadMyTasks(),
        loadAssignedByMeTasks(),
        loadUsers(),
        loadTravelLog(),
        loadLeaves(),
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMyTasks = async () => {
    try {
      const response = await ApiService.getTasks('myTasks');
      setMyTasks(response.tasks || []);
    } catch (error) {
      console.error('Error loading my tasks:', error);
    }
  };

  const loadAssignedByMeTasks = async () => {
    try {
      const response = await ApiService.getTasks('assignedByMe');
      setAssignedByMeTasks(response.tasks || []);
    } catch (error) {
      console.error('Error loading assigned by me tasks:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await ApiService.getAllUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTravelLog = async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const response = await ApiService.getCheckIns({ date: today });
      setTravelLog(response.checkIns || []);
    } catch (error) {
      console.error('Error loading travel log:', error);
    }
  };

  const loadLeaves = async () => {
    try {
      const response = await ApiService.getLeaves();
      setLeaves(response.leaves || []);
    } catch (error) {
      console.error('Error loading leaves:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeData();
    setRefreshing(false);
  };

  const handleCreateTask = async () => {
    try {
      if (!taskForm.title.trim() || !taskForm.assigneeId) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const taskData = {
        ...taskForm,
        dueDate: taskForm.dueDate.toISOString(),
      };

      if (editingTask) {
        await ApiService.updateTask(editingTask.id, taskData);
        Alert.alert('Success', 'Task updated successfully');
      } else {
        await ApiService.createTask(taskData);
        Alert.alert('Success', 'Task created successfully');
      }

      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        assigneeId: '',
        priority: 'Medium',
        dueDate: new Date(),
      });

      // Refresh tasks
      await loadMyTasks();
      await loadAssignedByMeTasks();
    } catch (error) {
      console.error('Error creating/updating task:', error);
      Alert.alert('Error', 'Failed to save task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await ApiService.updateTask(taskId, { completed: true });
      Alert.alert('Success', 'Task marked as complete');
      await loadMyTasks();
      await loadAssignedByMeTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteTask(taskId);
              Alert.alert('Success', 'Task deleted successfully');
              await loadMyTasks();
              await loadAssignedByMeTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      priority: task.priority,
      dueDate: new Date(task.dueDate),
    });
    setShowTaskModal(true);
  };

  const handleApplyLeave = async () => {
    try {
      if (!leaveForm.reason.trim()) {
        Alert.alert('Error', 'Please provide a reason for leave');
        return;
      }

      const leaveData = {
        ...leaveForm,
        fromDate: leaveForm.fromDate.toISOString(),
        toDate: leaveForm.toDate.toISOString(),
        days: moment(leaveForm.toDate).diff(moment(leaveForm.fromDate), 'days') + 1,
      };

      await ApiService.createLeave(leaveData);
      Alert.alert('Success', 'Leave application submitted successfully');
      
      setShowLeaveModal(false);
      setLeaveForm({
        type: 'Sick Leave',
        fromDate: new Date(),
        toDate: new Date(),
        reason: '',
      });

      await loadLeaves();
    } catch (error) {
      console.error('Error applying for leave:', error);
      Alert.alert('Error', 'Failed to submit leave application');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#FF4444';
      case 'Medium': return '#FF9500';
      case 'Low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#4CAF50';
      case 'Pending': return '#FF9500';
      case 'Rejected': return '#FF4444';
      default: return '#757575';
    }
  };

  const renderTaskItem = ({ item }) => {
    const isMyTask = activeTab === 'myTasks';
    const canEdit = !isMyTask && !item.completed;
    const canComplete = isMyTask && !item.completed;
    const isOverdue = moment(item.dueDate).isBefore(moment()) && !item.completed;

    return (
      <View style={[styles.taskCard, isOverdue && styles.overdueTask]}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        
        <Text style={styles.taskDescription}>{item.description}</Text>
        
        <View style={styles.taskMeta}>
          <Text style={styles.taskMetaText}>
            {isMyTask ? `Assigned by: ${item.assigner?.name}` : `Assigned to: ${item.assignee?.name}`}
          </Text>
          <Text style={styles.taskMetaText}>
            Due: {moment(item.dueDate).format('MMM DD, YYYY')}
          </Text>
        </View>

        {item.completed && (
          <View style={styles.completedBadge}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>
              Completed {moment(item.completedAt).format('MMM DD, YYYY')}
            </Text>
          </View>
        )}

        <View style={styles.taskActions}>
          {canComplete && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteTask(item._id)}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          
          {canEdit && (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditTask(item)}
              >
                <MaterialIcons name="edit" size={20} color="#2196F3" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTask(item._id)}
              >
                <MaterialIcons name="delete" size={20} color="#FF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderTravelLogItem = ({ item }) => (
    <View style={styles.travelLogCard}>
      <View style={styles.travelLogHeader}>
        <MaterialIcons name="location-on" size={24} color="#2196F3" />
        <View style={styles.travelLogInfo}>
          <Text style={styles.travelLogTitle}>
            {item.customer ? item.customer.name : 'General Check-in'}
          </Text>
          <Text style={styles.travelLogTime}>
            {moment(item.checkInTime).format('hh:mm A')}
            {item.checkOutTime && ` - ${moment(item.checkOutTime).format('hh:mm A')}`}
          </Text>
        </View>
        {item.checkOutTime && (
          <Text style={styles.durationText}>
            {moment.duration(moment(item.checkOutTime).diff(moment(item.checkInTime))).humanize()}
          </Text>
        )}
      </View>
    </View>
  );

  const renderLeaveItem = ({ item }) => (
    <View style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <Text style={styles.leaveType}>{item.type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.leaveDates}>
        {moment(item.fromDate).format('MMM DD')} - {moment(item.toDate).format('MMM DD, YYYY')}
      </Text>
      <Text style={styles.leaveDays}>{item.days} day(s)</Text>
      <Text style={styles.leaveReason}>{item.reason}</Text>
      
      {item.status === 'Approved' && item.approvedBy && (
        <Text style={styles.approvedBy}>Approved by: {item.approvedBy.name}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myTasks' && styles.activeTab]}
          onPress={() => setActiveTab('myTasks')}
        >
          <Text style={[styles.tabText, activeTab === 'myTasks' && styles.activeTabText]}>
            My Tasks ({myTasks.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assignedByMe' && styles.activeTab]}
          onPress={() => setActiveTab('assignedByMe')}
        >
          <Text style={[styles.tabText, activeTab === 'assignedByMe' && styles.activeTabText]}>
            Assigned By Me ({assignedByMeTasks.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'travelLog' && styles.activeTab]}
          onPress={() => setActiveTab('travelLog')}
        >
          <Text style={[styles.tabText, activeTab === 'travelLog' && styles.activeTabText]}>
            Travel Log
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leave' && styles.activeTab]}
          onPress={() => setActiveTab('leave')}
        >
          <Text style={[styles.tabText, activeTab === 'leave' && styles.activeTabText]}>
            Leave
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {(activeTab === 'myTasks' || activeTab === 'assignedByMe') && (
          <>
            {/* Assign New Task Button (only for assignedByMe tab) */}
            {activeTab === 'assignedByMe' && (
              <TouchableOpacity
                style={styles.assignButton}
                onPress={() => setShowTaskModal(true)}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.assignButtonText}>Assign New Task</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={activeTab === 'myTasks' ? myTasks : assignedByMeTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="assignment" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {activeTab === 'myTasks' ? 'No tasks assigned to you' : 'No tasks assigned by you'}
                  </Text>
                </View>
              }
            />
          </>
        )}

        {activeTab === 'travelLog' && (
          <FlatList
            data={travelLog}
            renderItem={renderTravelLogItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="location-on" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No travel log for today</Text>
              </View>
            }
          />
        )}

        {activeTab === 'leave' && (
          <>
            <TouchableOpacity
              style={styles.applyLeaveButton}
              onPress={() => setShowLeaveModal(true)}
            >
              <MaterialIcons name="event" size={24} color="#fff" />
              <Text style={styles.applyLeaveButtonText}>Apply for Leave</Text>
            </TouchableOpacity>

            <FlatList
              data={leaves}
              renderItem={renderLeaveItem}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="event" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No leave applications</Text>
                </View>
              }
            />
          </>
        )}
      </View>

      {/* Task Creation/Edit Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTask ? 'Edit Task' : 'Assign New Task'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Task Title *"
              value={taskForm.title}
              onChangeText={(text) => setTaskForm({ ...taskForm, title: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={taskForm.description}
              onChangeText={(text) => setTaskForm({ ...taskForm, description: text })}
              multiline
              numberOfLines={3}
            />

            {/* User Picker */}
            <Text style={styles.label}>Assign to:</Text>
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user._id}
                  style={[
                    styles.userItem,
                    taskForm.assigneeId === user._id && styles.selectedUser
                  ]}
                  onPress={() => setTaskForm({ ...taskForm, assigneeId: user._id })}
                >
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Priority Picker */}
            <Text style={styles.label}>Priority:</Text>
            <View style={styles.priorityContainer}>
              {['High', 'Medium', 'Low'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    taskForm.priority === priority && styles.selectedPriority,
                    { backgroundColor: taskForm.priority === priority ? getPriorityColor(priority) : '#f0f0f0' }
                  ]}
                  onPress={() => setTaskForm({ ...taskForm, priority })}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    taskForm.priority === priority && styles.selectedPriorityText
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                  setTaskForm({
                    title: '',
                    description: '',
                    assigneeId: '',
                    priority: 'Medium',
                    dueDate: new Date(),
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateTask}
              >
                <Text style={styles.saveButtonText}>
                  {editingTask ? 'Update' : 'Assign'} Task
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave Application Modal */}
      <Modal
        visible={showLeaveModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            
            {/* Leave Type Picker */}
            <Text style={styles.label}>Leave Type:</Text>
            <View style={styles.leaveTypeContainer}>
              {['Sick Leave', 'Casual Leave', 'Earned Leave'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.leaveTypeOption,
                    leaveForm.type === type && styles.selectedLeaveType
                  ]}
                  onPress={() => setLeaveForm({ ...leaveForm, type })}
                >
                  <Text style={[
                    styles.leaveTypeText,
                    leaveForm.type === type && styles.selectedLeaveTypeText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for leave *"
              value={leaveForm.reason}
              onChangeText={(text) => setLeaveForm({ ...leaveForm, reason: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowLeaveModal(false);
                  setLeaveForm({
                    type: 'Sick Leave',
                    fromDate: new Date(),
                    toDate: new Date(),
                    reason: '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleApplyLeave}
              >
                <Text style={styles.saveButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  applyLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  applyLeaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overdueTask: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskMeta: {
    marginBottom: 12,
  },
  taskMetaText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  travelLogCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  travelLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelLogInfo: {
    flex: 1,
    marginLeft: 12,
  },
  travelLogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  travelLogTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  durationText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  leaveDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  leaveDays: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  leaveReason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  approvedBy: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  userList: {
    maxHeight: 150,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedUser: {
    backgroundColor: '#e3f2fd',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priorityContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPriority: {
    // backgroundColor is set dynamically
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedPriorityText: {
    color: '#fff',
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leaveTypeOption: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  selectedLeaveType: {
    backgroundColor: '#2196F3',
  },
  leaveTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedLeaveTypeText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
