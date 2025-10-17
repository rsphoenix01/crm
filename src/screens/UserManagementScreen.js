// src/screens/UserManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import ApiService from '../utils/ApiService';

export default function UserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUsers();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllUsers();
      
      if (response.success) {
        setUsers(response.users);
        setFilteredUsers(response.users);
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.error('Load users error:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const searchUsers = (text) => {
    setSearchText(text);
    if (text.trim()) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(text.toLowerCase()) ||
        user.email.toLowerCase().includes(text.toLowerCase()) ||
        (user.phone && user.phone.includes(text))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  };

  const deleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ApiService.deleteUser(user._id || user.id);
              if (response.success) {
                Alert.alert('Success', 'User deleted successfully');
                loadUsers();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#FF3B30';
      case 'manager': return '#FF9500';
      case 'executive': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate('EditUser', { user: item })}
    >
      <View style={styles.userAvatar}>
        <Icon name="account-circle" size={50} color="#007AFF" />
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userPhone}>{item.phone || 'No phone'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
          <Text style={styles.roleText}>{item.role?.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.userActions}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('EditUser', { user: item })}
          style={styles.actionButton}
        >
          <Icon name="edit" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => deleteUser(item)}
          style={styles.actionButton}
        >
          <Icon name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchText}
          onChangeText={searchUsers}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => searchUsers('')}>
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {users.filter(u => u.role === 'executive').length}
          </Text>
          <Text style={styles.statLabel}>Executives</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {users.filter(u => u.dutyStatus).length}
          </Text>
          <Text style={styles.statLabel}>On Duty</Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => (item._id || item.id).toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddUser')}
      >
        <Icon name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  userCard: {
    backgroundColor: 'white',
    marginVertical: 5,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  userAvatar: {
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 5,
  },
  roleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'column',
  },
  actionButton: {
    padding: 8,
    marginVertical: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});