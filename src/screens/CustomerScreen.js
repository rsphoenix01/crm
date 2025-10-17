// CustomerScreen.js - Cleaned Up Version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import ApiService from '../utils/ApiService';

export default function CustomersScreen({ navigation, route }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading customers from API...');
      
      const response = await ApiService.getCustomers();
      console.log('📦 API Response:', response);
      
      if (response.success) {
        const customerData = response.customers || [];
        console.log(`✅ Loaded ${customerData.length} customers`);
        
        setCustomers(customerData);
        setFilteredCustomers(customerData);
      } else {
        console.error('❌ API Error:', response.message);
        Alert.alert('Error', response.message || 'Failed to load customers');
        setCustomers([]);
        setFilteredCustomers([]);
      }
    } catch (error) {
      console.error('🚨 Load customers error:', error);
      Alert.alert(
        'Connection Error', 
        'Failed to load customers. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: loadCustomers },
          { text: 'Cancel' }
        ]
      );
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const filterCustomers = (tab) => {
    setActiveTab(tab);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = customers;
    
    switch (tab) {
      case 'today':
        filtered = customers.filter(c => {
          if (!c.followUpDate) return false;
          const followUp = new Date(c.followUpDate);
          followUp.setHours(0, 0, 0, 0);
          return followUp.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        filtered = customers.filter(c => {
          if (!c.followUpDate) return false;
          return new Date(c.followUpDate) > today;
        });
        break;
      case 'pending':
        filtered = customers.filter(c => {
          if (!c.followUpDate) return false;
          return new Date(c.followUpDate) < today;
        });
        break;
      default:
        filtered = customers;
    }
    
    setFilteredCustomers(filtered);
  };

  const searchCustomers = (text) => {
    setSearchText(text);
    
    if (text.trim()) {
      const searchTerm = text.toLowerCase();
      
      const filtered = customers.filter(customer => {
        const customerName = customer.name ? customer.name.toLowerCase() : '';
        const contactPerson = customer.contactPerson ? customer.contactPerson.toLowerCase() : '';
        const phone = customer.phone || '';
        
        return customerName.includes(searchTerm) || 
               contactPerson.includes(searchTerm) || 
               phone.includes(text);
      });
      
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  };

  // UPDATED: Removed phone and map icons
  const renderCustomer = ({ item }) => (
    <TouchableOpacity 
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { customer: item })}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name || 'Unknown Customer'}</Text>
        <Text style={styles.customerContact}>{item.contactPerson || 'No contact person'}</Text>
        <Text style={styles.customerPhone}>{item.phone || 'No phone'}</Text>
        {item.location?.address && (
          <Text style={styles.customerAddress} numberOfLines={1}>
            📍 {item.location.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const TabButton = ({ title, tabKey }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.activeTab]}
      onPress={() => filterCustomers(tabKey)}
    >
      <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchText}
          onChangeText={searchCustomers}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity 
            onPress={() => searchCustomers('')}
            style={styles.clearButton}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TabButton title="All" tabKey="all" />
        <TabButton title="Today" tabKey="today" />
        <TabButton title="Upcoming" tabKey="upcoming" />
        <TabButton title="Pending" tabKey="pending" />
      </View>

      <Text style={styles.resultCount}>
        {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
      </Text>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={item => (item._id || item.id || Math.random()).toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchText ? 'No customers found for your search' : 'No customers added yet'}
            </Text>
            {!searchText && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddCustomer')}
              >
                <Text style={styles.emptyButtonText}>Add First Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCustomer')}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    margin: 4,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  resultCount: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  customerCard: {
    backgroundColor: 'white',
    marginVertical: 5,
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});