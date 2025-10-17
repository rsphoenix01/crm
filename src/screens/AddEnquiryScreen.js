// screens/AddEnquiryScreen.js - Updated with Live Location Tracking
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
import LocationInput from '../components/LocationInput';
import ApiService from '../utils/ApiService';
import LocationService from '../utils/LocationService';

export default function AddEnquiryScreen({ navigation, route }) {
  const { customer, editMode, enquiry } = route.params || {};
  
  const [enquiryData, setEnquiryData] = useState({
    customerName: customer?.name || '',
    customerId: customer?.id || customer?._id || null,
    followUpDate: new Date(Date.now() + 86400000),
    notes: '',
    products: [],
  });
  
  const [salesPersonLocation, setSalesPersonLocation] = useState({
    latitude: null,
    longitude: null,
    address: ''
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoCapturingLocation, setAutoCapturingLocation] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    rate: '',
    tax: '18',
    quantity: '1',
    description: ''
  });
  useEffect(() => {
    if (editMode && enquiry) {
      setEnquiryData({
        ...enquiry,
        followUpDate: new Date(enquiry.followUpDate),
        customerId: enquiry.customer?.id || enquiry.customer,
        customerName: enquiry.customer?.name || enquiry.customerName,
      });
      
      if (enquiry.salesPersonLocation) {
        setSalesPersonLocation(enquiry.salesPersonLocation);
      }
    }
    
    loadProducts();
    loadCustomers();
    
    // Auto-capture sales person's current location for new enquiries
    if (!editMode) {
      autoCaptureSalesPersonLocation();
    }
  }, []);
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
    
    // Create product object with guaranteed unique ID
    const productToAdd = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newProduct.name.trim(),
      rate: rate,
      tax: tax,
      quantity: quantity,
      total: total
    };
    
    console.log('➕ Adding manual product:', productToAdd);
    
    // Add to enquiry
    setEnquiryData({
      ...enquiryData,
      products: [...enquiryData.products, productToAdd]
    });
    
    // Reset form and close modal
    setNewProduct({
      name: '',
      rate: '',
      tax: '18',
      quantity: '1',
      description: ''
    });
    setShowProductModal(false);
    
    Alert.alert('Success', `${productToAdd.name} added to enquiry!`);
  };
  

  const autoCaptureSalesPersonLocation = async () => {
    try {
      setAutoCapturingLocation(true);
      const locationData = await LocationService.getCurrentLocationWithAddress();
      setSalesPersonLocation({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        timestamp: locationData.timestamp
      });
    } catch (error) {
      console.warn('Could not auto-capture sales person location:', error);
      // Don't show error to user for auto-capture
    } finally {
      setAutoCapturingLocation(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await ApiService.getProducts();
      setAvailableProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      // Use fallback mock data if API fails
      const mockProducts = [
        { id: 1, name: 'Enterprise Software License', rate: 50000, tax: 18 },
        { id: 2, name: 'Professional Services', rate: 2000, tax: 18 },
        { id: 3, name: 'Hardware Server', rate: 150000, tax: 18 },
        { id: 4, name: 'Support Package', rate: 10000, tax: 18 },
      ];
      setAvailableProducts(mockProducts);
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
    setEnquiryData({
      ...enquiryData,
      customerId: selectedCustomer.id || selectedCustomer._id,
      customerName: selectedCustomer.name,
    });
    setShowCustomerModal(false);
    setSearchCustomer('');
  };

  const addProduct = (product) => {
    console.log('➕ Adding product:', product);
    
    const existingIndex = enquiryData.products.findIndex(p => 
      (p.id || p._id) === (product.id || product._id)
    );
    
    if (existingIndex >= 0) {
      // Increase quantity if product already exists
      const updatedProducts = [...enquiryData.products];
      updatedProducts[existingIndex].quantity += 1;
      updatedProducts[existingIndex].total = updatedProducts[existingIndex].quantity * updatedProducts[existingIndex].rate;
      
      console.log('📈 Updated existing product quantity:', updatedProducts[existingIndex]);
      
      setEnquiryData({
        ...enquiryData,
        products: updatedProducts,
      });
    } else {
      // Add new product with guaranteed ID
      const newProduct = {
        id: product.id || product._id || `manual_${Date.now()}`,
        name: product.name,
        rate: product.rate,
        tax: product.tax,
        quantity: 1,
        total: product.rate,
      };
      
      console.log('🆕 Adding new product:', newProduct);
      
      setEnquiryData({
        ...enquiryData,
        products: [...enquiryData.products, newProduct],
      });
    }
    
    setShowProductModal(false);
    setSearchProduct('');
  };

  const updateProductQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeProduct(index);
      return;
    }

    const updatedProducts = [...enquiryData.products];
    updatedProducts[index].quantity = quantity;
    updatedProducts[index].total = quantity * updatedProducts[index].rate;
    
    setEnquiryData({
      ...enquiryData,
      products: updatedProducts,
    });
  };

  const removeProduct = (index) => {
    const updatedProducts = enquiryData.products.filter((_, i) => i !== index);
    setEnquiryData({
      ...enquiryData,
      products: updatedProducts,
    });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    
    enquiryData.products.forEach(product => {
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
    if (!enquiryData.customerName || !enquiryData.customerId || enquiryData.products.length === 0) {
      Alert.alert('Error', 'Please select a customer and add at least one product');
      return;
    }

    try {
      setLoading(true);
      
      const totals = calculateTotals();
      
      // Process products carefully
      const processedProducts = enquiryData.products.map((product, index) => {
        let productId = product.id || product._id || product.product;
        
        // Generate ID for manual products if missing
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

      console.log('📤 Sending products:', processedProducts);

      const enquiryPayload = {
        products: processedProducts,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        followUpDate: enquiryData.followUpDate.toISOString(),
        notes: enquiryData.notes || '',
      };

      // Only include customer info for NEW enquiries
      if (!editMode) {
        enquiryPayload.customer = enquiryData.customerId;
        enquiryPayload.customerName = enquiryData.customerName;
      }

      console.log('📤 Final payload:', enquiryPayload);

      if (editMode && enquiry) {
        await ApiService.updateEnquiry(enquiry.id || enquiry._id, enquiryPayload);
        Alert.alert('Success', 'Enquiry updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await ApiService.createEnquiry(enquiryPayload);
        Alert.alert('Success', 'Enquiry created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('💥 Save error:', error);
      Alert.alert('Error', `Failed to save enquiry: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEnquiryData({ ...enquiryData, followUpDate: selectedDate });
    }
  };

  const totals = calculateTotals();
  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );
  const filteredCustomers = availableCustomers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Sales Person Location Indicator */}
        {autoCapturingLocation && (
          <View style={styles.locationCapturingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.locationCapturingText}>
              Capturing your current location...
            </Text>
          </View>
        )}

        {salesPersonLocation.latitude && (
          <View style={styles.salesPersonLocationInfo}>
            <Icon name="my-location" size={20} color="#4CAF50" />
            <Text style={styles.salesPersonLocationText}>
              Location: {salesPersonLocation.address}
            </Text>
            <TouchableOpacity onPress={autoCaptureSalesPersonLocation}>
              <Icon name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}

        {!salesPersonLocation.latitude && !autoCapturingLocation && (
          <TouchableOpacity 
            style={styles.captureLocationButton}
            onPress={autoCaptureSalesPersonLocation}
          >
            <Icon name="location-on" size={20} color="#FF9800" />
            <Text style={styles.captureLocationText}>
              Tap to capture your current location (recommended)
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Customer *</Text>
        {enquiryData.customerName ? (
          <View style={styles.selectedCustomer}>
            <Text style={styles.customerName}>{enquiryData.customerName}</Text>
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

        <Text style={styles.label}>Follow-up Date</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="event" size={20} color="#666" />
          <Text style={styles.dateText}>
            {enquiryData.followUpDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={enquiryData.followUpDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Products *</Text>
        {enquiryData.products.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productRate}>Rs.{product.rate} x {product.quantity}</Text>
              <Text style={styles.productTotal}>Total: Rs.{product.total.toLocaleString()}</Text>
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
          value={enquiryData.notes}
          onChangeText={(text) => setEnquiryData({ ...enquiryData, notes: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>Rs.{totals.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>Rs.{totals.taxAmount.toLocaleString()}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>Rs.{totals.grandTotal.toLocaleString()}</Text>
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
              {editMode ? 'Update Enquiry' : 'Save Enquiry'}
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
        {/* Product Name */}
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter product name"
          value={newProduct.name}
          onChangeText={(text) => setNewProduct({...newProduct, name: text})}
          autoFocus={true}
        />
        
        {/* Description */}
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter product description"
          value={newProduct.description}
          onChangeText={(text) => setNewProduct({...newProduct, description: text})}
          multiline={true}
          numberOfLines={3}
        />
        
        {/* Rate */}
        <Text style={styles.label}>Rate (₹) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter rate per unit"
          value={newProduct.rate}
          onChangeText={(text) => setNewProduct({...newProduct, rate: text})}
          keyboardType="numeric"
        />
        
        {/* Tax */}
        <Text style={styles.label}>Tax (%)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter tax percentage"
          value={newProduct.tax}
          onChangeText={(text) => setNewProduct({...newProduct, tax: text})}
          keyboardType="numeric"
        />
        
        {/* Quantity */}
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter quantity"
          value={newProduct.quantity}
          onChangeText={(text) => setNewProduct({...newProduct, quantity: text})}
          keyboardType="numeric"
        />
        
        {/* Preview */}
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
const additionalStyles = {
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
    maxHeight: 400,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  previewContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  previewTax: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  previewTotal: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  addProductButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
};
// Styles remain the same as before, but adding new location-related styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  locationCapturingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  locationCapturingText: {
    marginLeft: 10,
    color: '#007AFF',
    fontSize: 14,
  },
  salesPersonLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  salesPersonLocationText: {
    marginLeft: 10,
    color: '#4CAF50',
    fontSize: 12,
    flex: 1,
  },
  captureLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  captureLocationText: {
    marginLeft: 10,
    color: '#FF9800',
    fontSize: 14,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  selectedCustomer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  dateButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
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
  addProductText: {
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
  productOption: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  productOptionInfo: {
    flex: 1,
  },
  productOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productOptionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productOptionPrice: {
    alignItems: 'flex-end',
  },
  productOptionRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  productOptionTax: {
    fontSize: 12,
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
  ...additionalStyles
  
}
);
