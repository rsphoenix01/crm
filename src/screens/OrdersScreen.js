// screens/OrdersScreen.js - With Search Functionality
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import ApiService from '../utils/ApiService';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getOrders();
      setOrders(response.orders || []);
      setFilteredOrders(response.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.orderNumber?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.notes?.toLowerCase().includes(query) ||
      order.products?.some(p => p.name?.toLowerCase().includes(query))
    );
    setFilteredOrders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'partial': return '#2196F3';
      case 'paid': return '#4CAF50';
      case 'delivered': return '#9C27B0';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const handlePayment = (order) => {
    setSelectedOrder(order);
    setPaymentAmount(order.balanceAmount.toString());
    setShowPaymentModal(true);
  };

  const savePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedOrder.balanceAmount) {
      Alert.alert('Error', 'Payment amount cannot exceed balance amount');
      return;
    }

    try {
      await ApiService.addPayment(selectedOrder._id || selectedOrder.id, {
        amount,
        mode: paymentMode,
        reference: `PAY-${Date.now()}`,
        notes: `Payment via ${paymentMode}`
      });
      
      Alert.alert('Success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      loadOrders();
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const deleteOrder = (order) => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order ${order.orderNumber} for ${order.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await ApiService.deleteOrder(order._id || order.id);
              if (response.success) {
                Alert.alert('Success', 'Order deleted successfully');
                loadOrders();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete order');
              }
            } catch (error) {
              console.error('Delete order error:', error);
              Alert.alert('Error', 'Failed to delete order');
            }
          }
        }
      ]
    );
  };

  const generateInvoice = (order) => {
    Alert.alert('Generate Invoice', 'Invoice generation functionality will be implemented soon');
  };

  const editOrder = (order) => {
    navigation.navigate('AddOrder', { 
      editMode: true, 
      order: order 
    });
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View style={styles.orderHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => editOrder(item)}
          >
            <Icon name="edit" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.orderDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      
      <View style={styles.productsContainer}>
        {item.products?.slice(0, 2).map((product, index) => (
          <Text key={index} style={styles.productText}>
            {product.name} - {product.quantity} x Rs.{product.rate}
          </Text>
        ))}
        {item.products?.length > 2 && (
          <Text style={styles.moreProductsText}>
            +{item.products.length - 2} more products
          </Text>
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total (GT):</Text>
          <Text style={styles.amountValue}>Rs.{item.totalAmount?.toLocaleString()}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Paid:</Text>
          <Text style={[styles.amountValue, { color: '#4CAF50' }]}>
            Rs.{item.paidAmount?.toLocaleString() || '0'}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Balance (BL):</Text>
          <Text style={[styles.amountValue, { 
            color: (item.balanceAmount || item.totalAmount) > 0 ? '#FF9800' : '#4CAF50' 
          }]}>
            Rs.{(item.balanceAmount || item.totalAmount)?.toLocaleString()}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderActions}>
        {(item.balanceAmount || item.totalAmount) > 0 && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handlePayment(item)}
          >
            <Icon name="payment" size={20} color="white" />
            <Text style={styles.actionText}>Payment</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          onPress={() => generateInvoice(item)}
        >
          <Icon name="receipt" size={20} color="white" />
          <Text style={styles.actionText}>Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          onPress={() => deleteOrder(item)}
        >
          <Icon name="delete" size={20} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customers, products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Count */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            Found {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={item => (item._id || item.id).toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="shopping-cart" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No orders found matching your search' : 'No orders found'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Try a different search term' : 'Create your first order to get started'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddOrder')}
      >
        <Icon name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            
            <Text style={styles.modalLabel}>Order: {selectedOrder?.orderNumber}</Text>
            <Text style={styles.modalLabel}>
              Balance Amount: Rs.{selectedOrder?.balanceAmount?.toLocaleString()}
            </Text>
            
            <Text style={styles.inputLabel}>Payment Amount</Text>
            <TextInput
              style={styles.paymentInput}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />
            
            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.paymentModes}>
              {['cash', 'online', 'cheque'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    paymentMode === mode && styles.activeModeButton
                  ]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={[
                    styles.modeText,
                    paymentMode === mode && styles.activeModeText
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={savePayment}
              >
                <Text style={styles.saveButtonText}>Save Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  resultsInfo: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    paddingHorizontal: 15,
  },
  resultsText: {
    fontSize: 14,
    color: '#1976d2',
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
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  editButton: {
    padding: 5,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  productsContainer: {
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  productText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  moreProductsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  amountContainer: {
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  paymentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  paymentModes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeModeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modeText: {
    fontSize: 14,
    color: '#666',
  },
  activeModeText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});