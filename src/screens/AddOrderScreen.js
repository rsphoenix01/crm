// screens/AddOrderScreen.js - Same as AddEnquiryScreen but for Orders
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ApiService from '../utils/ApiService';

export default function AddOrderScreen({ navigation, route }) {
  const { customer, editMode, order } = route.params || {};
  
  const [orderData, setOrderData] = useState({
    customerName: customer?.name || '',
    customerId: customer?.id || customer?._id || null,
    deliveryDate: new Date(Date.now() + 7 * 86400000), // 7 days from now
    notes: '',
    products: [],
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    rate: '',
    tax: '18',
    quantity: '1',
    description: ''
  });

  useEffect(() => {
    if (editMode && order) {
      setOrderData({
        ...order,
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : new Date(Date.now() + 7 * 86400000),
        customerId: order.customer?.id || order.customer,
        customerName: order.customer?.name || order.customerName,
      });
    }
    
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await ApiService.getProducts();
      setAvailableProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await ApiService.getCustomers();
      setAvailableCustomers(response.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    }
  };

  const selectCustomer = (selectedCustomer) => {
    setOrderData({
      ...orderData,
      customerId: selectedCustomer.id || selectedCustomer._id,
      customerName: selectedCustomer.name,
    });
    setShowCustomerModal(false);
    setSearchCustomer('');
  };

  const addProduct = (product) => {
    const existingIndex = orderData.products.findIndex(p => 
      (p.id || p._id) === (product.id || product._id)
    );
    
    if (existingIndex >= 0) {
      const updatedProducts = [...orderData.products];
      updatedProducts[existingIndex].quantity += 1;
      updatedProducts[existingIndex].total = updatedProducts[existingIndex].quantity * updatedProducts[existingIndex].rate;
      
      setOrderData({
        ...orderData,
        products: updatedProducts,
      });
    } else {
      const newProduct = {
        id: product.id || product._id || `manual_${Date.now()}`,
        name: product.name,
        rate: product.rate,
        tax: product.tax,
        quantity: 1,
        total: product.rate,
      };
      
      setOrderData({
        ...orderData,
        products: [...orderData.products, newProduct],
      });
    }
    
    setShowProductModal(false);
    setSearchProduct('');
  };

  const addManualProduct = () => {
    if (!newProduct.name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    
    if (!newProduct.rate || parseFloat(newProduct.rate) <= 0) {
      Alert.alert('Error', 'Please enter a valid rate greater than 0');
      return;
    }
    
    const rate = parseFloat(newProduct.rate);
    const tax = parseFloat(newProduct.tax) || 0;
    const quantity = parseInt(newProduct.quantity) || 1;
    const total = rate * quantity;
    
    const productToAdd = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newProduct.name.trim(),
      rate: rate,
      tax: tax,
      quantity: quantity,
      total: total
    };
    
    setOrderData({
      ...orderData,
      products: [...orderData.products, productToAdd]
    });
    
    setNewProduct({
      name: '',
      rate: '',
      tax: '18',
      quantity: '1',
      description: ''
    });
    setShowProductModal(false);
    
    Alert.alert('Success', `${productToAdd.name} added to order!`);
  };

  const updateProductQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeProduct(index);
      return;
    }

    const updatedProducts = [...orderData.products];
    updatedProducts[index].quantity = quantity;
    updatedProducts[index].total = quantity * updatedProducts[index].rate;
    
    setOrderData({
      ...orderData,
      products: updatedProducts,
    });
  };

  const removeProduct = (index) => {
    const updatedProducts = orderData.products.filter((_, i) => i !== index);
    setOrderData({
      ...orderData,
      products: updatedProducts,
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    
    orderData.products.forEach(product => {
      subtotal += product.total;
      taxAmount += (product.total * product.tax) / 100;
    });
    
    return {
      subtotal,
      taxAmount,
      grandTotal: subtotal + taxAmount,
    };
  };

  const handleSave = async () => {
    if (!orderData.customerName || !orderData.customerId || orderData.products.length === 0) {
      Alert.alert('Error', 'Please select a customer and add at least one product');
      return;
    }

    try {
      setLoading(true);
      
      const totals = calculateTotals();
      
      const processedProducts = orderData.products.map((product, index) => {
        let productId = product.id || product._id || product.product;
        
        if (!productId) {
          productId = `manual_${Date.now()}_${index}`;
        }

        return {
          product: productId,
          name: product.name || 'Unnamed Product',
          quantity: parseInt(product.quantity) || 1,
          rate: parseFloat(product.rate) || 0,
          tax: parseFloat(product.tax) || 0,
          total: parseFloat(product.total) || 0,
        };
      });

      const orderPayload = {
        products: processedProducts,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.grandTotal,
        deliveryDate: orderData.deliveryDate.toISOString(),
        notes: orderData.notes || '',
      };

      if (!editMode) {
        orderPayload.customer = orderData.customerId;
        orderPayload.customerName = orderData.customerName;
      }

      console.log('📤 Final order payload:', orderPayload);

      if (editMode && order) {
        await ApiService.updateOrder(order.id || order._id, orderPayload);
        Alert.alert('Success', 'Order updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ApiService.createOrder(orderPayload);
        Alert.alert('Success', 'Order created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('💥 Save error:', error);
      Alert.alert('Error', `Failed to save order: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setOrderData({ ...orderData, deliveryDate: selectedDate });
    }
  };

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const filteredCustomers = availableCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    customer.phone.includes(searchCustomer)
  );

  const totals = calculateTotals();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Customer *</Text>
        {orderData.customerName ? (
          <View style={styles.selectedCustomer}>
            <Text style={styles.customerName}>{orderData.customerName}</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
              <Icon name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowCustomerModal(true)}
          >
            <Text style={styles.selectButtonText}>Select Customer</Text>
            <Icon name="arrow-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Delivery Date</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="event" size={20} color="#666" />
          <Text style={styles.dateText}>
            {orderData.deliveryDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={orderData.deliveryDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Products *</Text>
        {orderData.products.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productRate}>₹{product.rate} x {product.quantity}</Text>
              <Text style={styles.productTotal}>Total: ₹{product.total.toLocaleString()}</Text>
            </View>
            <View style={styles.productActions}>
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => updateProductQuantity(index, product.quantity - 1)}
                >
                  <Icon name="remove" size={16} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{product.quantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => updateProductQuantity(index, product.quantity + 1)}
                >
                  <Icon name="add" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeProduct(index)}>
                <Icon name="delete" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addProductButton}
          onPress={() => setShowProductModal(true)}
        >
          <Icon name="add" size={20} color="#007AFF" />
          <Text style={styles.addProductButtonText}>Add Product</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter any notes"
          value={orderData.notes}
          onChangeText={(text) => setOrderData({ ...orderData, notes: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{totals.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>₹{totals.taxAmount.toLocaleString()}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>₹{totals.grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editMode ? 'Update Order' : 'Save Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSearch}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search customers..."
              value={searchCustomer}
              onChangeText={setSearchCustomer}
            />
          </View>

          <FlatList
            data={filteredCustomers}
            keyExtractor={item => (item.id || item._id).toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.customerOption}
                onPress={() => selectCustomer(item)}
              >
                <View>
                  <Text style={styles.customerOptionName}>{item.name}</Text>
                  <Text style={styles.customerOptionContact}>{item.contactPerson}</Text>
                  <Text style={styles.customerOptionPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No customers found</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowProductModal(false);
                  setNewProduct({ name: '', rate: '', tax: '18', quantity: '1', description: '' });
                }}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({...newProduct, name: text})}
                autoFocus={true}
              />
              
              <Text style={styles.label}>Rate (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter rate per unit"
                value={newProduct.rate}
                onChangeText={(text) => setNewProduct({...newProduct, rate: text})}
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Tax (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tax percentage"
                value={newProduct.tax}
                onChangeText={(text) => setNewProduct({...newProduct, tax: text})}
                keyboardType="numeric"
              />
              
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={newProduct.quantity}
                onChangeText={(text) => setNewProduct({...newProduct, quantity: text})}
                keyboardType="numeric"
              />
              
              {newProduct.name && newProduct.rate && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Preview:</Text>
                  <Text style={styles.previewText}>
                    {newProduct.name} - ₹{newProduct.rate} x {newProduct.quantity || 1} = ₹{(parseFloat(newProduct.rate) * parseInt(newProduct.quantity || 1)).toLocaleString()}
                  </Text>
                  <Text style={styles.previewTax}>
                    Tax ({newProduct.tax || 0}%): ₹{((parseFloat(newProduct.rate) * parseInt(newProduct.quantity || 1) * parseFloat(newProduct.tax || 0)) / 100).toLocaleString()}
                  </Text>
                  <Text style={styles.previewTotal}>
                    Total: ₹{((parseFloat(newProduct.rate) * parseInt(newProduct.quantity || 1)) + ((parseFloat(newProduct.rate) * parseInt(newProduct.quantity || 1) * parseFloat(newProduct.tax || 0)) / 100)).toLocaleString()}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowProductModal(false);
                  setNewProduct({ name: '', rate: '', tax: '18', quantity: '1', description: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addManualProduct}
              >
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectedCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  productItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productRate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  productTotal: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    paddingHorizontal: 5,
  },
  quantityButton: {
    padding: 5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 10,
    minWidth: 25,
    textAlign: 'center',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 20,
  },
  addProductButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  totalsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 2,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 16,
  },
  customerOption: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  customerOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  customerOptionContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  customerOptionPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  addButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewTax: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
});