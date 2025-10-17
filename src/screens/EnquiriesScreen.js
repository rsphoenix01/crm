// Fixed EnquiriesScreen.js - Replace your entire file with this

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

export default function EnquiriesScreen({ navigation }) {
  const [enquiries, setEnquiries] = useState([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEnquiries();
  }, []);

  // Add focus listener to reload when returning to screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEnquiries();
    });
    return unsubscribe;
  }, [navigation]);

  // FIXED: Load enquiries from actual API
  const loadEnquiries = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading enquiries from API...');
      
      const response = await ApiService.getEnquiries();
      console.log('📦 API Response:', response);
      
      if (response.success) {
        const enquiryData = response.enquiries || [];
        console.log(`✅ Loaded ${enquiryData.length} enquiries`);
        
        setEnquiries(enquiryData);
        setFilteredEnquiries(enquiryData);
      } else {
        console.error('❌ API Error:', response.message);
        Alert.alert('Error', response.message || 'Failed to load enquiries');
        setEnquiries([]);
        setFilteredEnquiries([]);
      }
    } catch (error) {
      console.error('🚨 Load enquiries error:', error);
      Alert.alert(
        'Connection Error', 
        'Failed to load enquiries. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: loadEnquiries },
          { text: 'Cancel' }
        ]
      );
      setEnquiries([]);
      setFilteredEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnquiries();
    setRefreshing(false);
  };

  const searchEnquiries = (text) => {
    setSearchText(text);
    if (text.trim()) {
      const searchTerm = text.toLowerCase();
      const filtered = enquiries.filter(e =>
        (e.customerName && e.customerName.toLowerCase().includes(searchTerm)) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm)) ||
        (e.products && e.products.some && e.products.some(p => 
          p.name && p.name.toLowerCase().includes(searchTerm)
        ))
      );
      setFilteredEnquiries(filtered);
      console.log(`🔍 Search "${text}" found ${filtered.length} results`);
    } else {
      setFilteredEnquiries(enquiries);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'quoted': return '#2196F3';
      case 'order done': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const convertToOrder = async (enquiry) => {
    try {
      Alert.alert(
        'Convert to Order',
        `Convert enquiry for ${enquiry.customerName} to order?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Convert', onPress: async () => {
            try {
              const response = await ApiService.convertEnquiryToOrder(enquiry._id || enquiry.id);
              if (response.success) {
                Alert.alert('Success', 'Enquiry converted to order successfully');
                loadEnquiries(); // Reload to update status
                navigation.navigate('Orders');
              } else {
                Alert.alert('Error', response.message || 'Failed to convert enquiry');
              }
            } catch (error) {
              console.error('Convert enquiry error:', error);
              Alert.alert('Error', 'Failed to convert enquiry to order');
            }
          }}
        ]
      );
    } catch (error) {
      console.error('Convert to order error:', error);
      Alert.alert('Error', 'Failed to convert enquiry to order');
    }
  };

  const generateQuote = (enquiry) => {
    Alert.alert('Generate Quote', 'Quotation generation functionality to be implemented');
  };

  const deleteEnquiry = (enquiry) => {
    Alert.alert(
      'Delete Enquiry',
      `Are you sure you want to delete enquiry for ${enquiry.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const response = await ApiService.deleteEnquiry(enquiry._id || enquiry.id);
            if (response.success) {
              Alert.alert('Success', 'Enquiry deleted successfully');
              loadEnquiries(); // Reload list
            } else {
              Alert.alert('Error', response.message || 'Failed to delete enquiry');
            }
          } catch (error) {
            console.error('Delete enquiry error:', error);
            Alert.alert('Error', 'Failed to delete enquiry');
          }
        }}
      ]
    );
  };

  // Enhanced rendering with better data handling
  const renderEnquiry = ({ item }) => {
    const enquiry = item;
    
    // Handle products display
    let productsText = 'No products';
    if (enquiry.products && Array.isArray(enquiry.products)) {
      productsText = enquiry.products.map(p => p.name).join(', ');
    } else if (enquiry.products && typeof enquiry.products === 'string') {
      productsText = enquiry.products;
    }

    // Handle dates
    const createdDate = enquiry.createdAt || enquiry.date || new Date().toISOString();
    const followUpDate = enquiry.followUpDate || new Date().toISOString();

    // Handle total amount
    const totalAmount = enquiry.grandTotal || enquiry.totalAmount || 0;

    return (
      <TouchableOpacity 
        style={styles.enquiryCard}
        onPress={() => navigation.navigate('AddEnquiry', { 
          editMode: true, 
          enquiry: enquiry 
        })}
      >
        <View style={styles.enquiryHeader}>
          <Text style={styles.customerName}>{enquiry.customerName || 'Unknown Customer'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(enquiry.status) }]}>
            <Text style={styles.statusText}>{enquiry.status || 'pending'}</Text>
          </View>
        </View>
        
        <Text style={styles.products} numberOfLines={2}>
          Products: {productsText}
        </Text>
        <Text style={styles.amount}>₹{totalAmount.toLocaleString()}</Text>
        
        <View style={styles.dateContainer}>
          <Text style={styles.date}>
            Created: {new Date(createdDate).toLocaleDateString()}
          </Text>
          <Text style={styles.date}>
            Follow-up: {new Date(followUpDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.enquiryActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={() => generateQuote(enquiry)}
          >
            <Icon name="description" size={20} color="white" />
            <Text style={styles.actionText}>Quote</Text>
          </TouchableOpacity>
          
          {enquiry.status === 'quoted' && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => convertToOrder(enquiry)}
            >
              <Icon name="shopping-cart" size={20} color="white" />
              <Text style={styles.actionText}>Convert to Order</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={() => deleteEnquiry(enquiry)}
          >
            <Icon name="delete" size={20} color="white" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading enquiries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search enquiries by customer or products..."
          value={searchText}
          onChangeText={searchEnquiries}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity 
            onPress={() => searchEnquiries('')}
            style={styles.clearButton}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultCount}>
        {filteredEnquiries.length} enquir{filteredEnquiries.length !== 1 ? 'ies' : 'y'} found
      </Text>

      <FlatList
        data={filteredEnquiries}
        renderItem={renderEnquiry}
        keyExtractor={item => (item._id || item.id || Math.random()).toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchText ? 'No enquiries found for your search' : 'No enquiries created yet'}
            </Text>
            {!searchText && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddEnquiry')}
              >
                <Text style={styles.emptyButtonText}>Create First Enquiry</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEnquiry')}
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
    margin: 15,
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
  resultCount: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  enquiryCard: {
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
  enquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  products: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  enquiryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
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