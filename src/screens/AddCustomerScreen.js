// screens/AddCustomerScreen.js - Updated with Map-based Address Selection
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ApiService from '../utils/ApiService';
import MapAddressSelector from '../components/MapAddressSelector';

export default function AddCustomerScreen({ navigation, route }) {
  const { editMode, customer } = route.params || {};
  
  const [customerData, setCustomerData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gst: '',
    notes: '',
  });
  
  // Customer's actual business location (manually entered via map)
  const [customerLocation, setCustomerLocation] = useState({
    latitude: null,
    longitude: null,
    address: ''
  });
  
  // Salesperson's current location (auto-captured)
  const [salesPersonLocation, setSalesPersonLocation] = useState({
    latitude: null,
    longitude: null,
    address: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [autoCapturingLocation, setAutoCapturingLocation] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);

  useEffect(() => {
    if (editMode && customer) {
      setCustomerData(customer);
      if (customer.location) {
        setCustomerLocation(customer.location);
      }
    }
    
    // Auto-capture sales person's current location for tracking
    if (!editMode) {
      autoCaptureSalesPersonLocation();
    }
  }, [editMode, customer]);

  const autoCaptureSalesPersonLocation = async () => {
    try {
      setAutoCapturingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const { latitude, longitude } = location.coords;
        
        // Get address for salesperson location
        const result = await Location.reverseGeocodeAsync({ latitude, longitude });
        let address = 'Unknown location';
        
        if (result && result.length > 0) {
          const addr = result[0];
          const addressParts = [];
          if (addr.street) addressParts.push(addr.street);
          if (addr.district) addressParts.push(addr.district);
          if (addr.city) addressParts.push(addr.city);
          if (addr.region) addressParts.push(addr.region);
          address = addressParts.join(', ').trim() || 'Current location';
        }
        
        setSalesPersonLocation({
          latitude,
          longitude,
          address,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.warn('Could not auto-capture sales person location:', error);
    } finally {
      setAutoCapturingLocation(false);
    }
  };

  // Handle location selection from map
  const handleLocationSelect = (location) => {
    setCustomerLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      captureMethod: 'manual_map_selection',
      timestamp: new Date()
    });
  };

  // Quick option to use current GPS location as customer location
  const useCurrentLocationForCustomer = async () => {
    Alert.alert(
      'Use Current Location',
      'This will set the customer location to your current GPS position. Use this only if you are currently at the customer\'s location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setAutoCapturingLocation(true);
              const { status } = await Location.requestForegroundPermissionsAsync();
              
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is needed to capture location.');
                return;
              }

              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              
              const { latitude, longitude } = location.coords;
              
              // Get address
              const result = await Location.reverseGeocodeAsync({ latitude, longitude });
              let address = 'Current location';
              
              if (result && result.length > 0) {
                const addr = result[0];
                const addressParts = [];
                if (addr.street) addressParts.push(addr.street);
                if (addr.district) addressParts.push(addr.district);
                if (addr.city) addressParts.push(addr.city);
                if (addr.region) addressParts.push(addr.region);
                address = addressParts.join(', ').trim() || 'Current location';
              }
              
              setCustomerLocation({
                latitude,
                longitude,
                address,
                captureMethod: 'gps_current',
                timestamp: new Date()
              });
              
              Alert.alert('Location Captured', `Customer location set to current GPS location:\n${address}`);
            } catch (error) {
              console.error('Location capture error:', error);
              Alert.alert('Error', 'Failed to capture current location. Please try again.');
            } finally {
              setAutoCapturingLocation(false);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!customerData.name || !customerData.phone) {
      Alert.alert('Error', 'Please fill in required fields (Name and Phone)');
      return;
    }

    if (!customerLocation.latitude || !customerLocation.longitude) {
      Alert.alert(
        'Location Required', 
        'Please set the customer location before saving. This helps with route planning and nearby customer searches.'
      );
      return;
    }

    try {
      setLoading(true);
      
      const customerPayload = {
        ...customerData,
        location: customerLocation,
        salesPersonLocation: salesPersonLocation
      };

      let response;
      if (editMode) {
        response = await ApiService.updateCustomer(customer.id || customer._id, customerPayload);
      } else {
        response = await ApiService.createCustomer(customerPayload);
      }

      if (response.success) {
        Alert.alert(
          'Success', 
          `Customer ${editMode ? 'updated' : 'added'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', error.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Sales Person Location Indicator */}
        {autoCapturingLocation && (
          <View style={styles.locationCapturingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.locationCapturingText}>
              Capturing your location for tracking...
            </Text>
          </View>
        )}

        {salesPersonLocation.latitude && (
          <View style={styles.salesPersonLocationInfo}>
            <Icon name="person-pin-circle" size={20} color="#4CAF50" />
            <Text style={styles.salesPersonLocationText}>
              Added from: {salesPersonLocation.address}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter company name"
          value={customerData.name}
          onChangeText={(text) => setCustomerData({ ...customerData, name: text })}
        />

        <Text style={styles.label}>Contact Person</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter contact person name"
          value={customerData.contactPerson}
          onChangeText={(text) => setCustomerData({ ...customerData, contactPerson: text })}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={customerData.phone}
          onChangeText={(text) => setCustomerData({ ...customerData, phone: text })}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email address"
          value={customerData.email}
          onChangeText={(text) => setCustomerData({ ...customerData, email: text })}
          keyboardType="email-address"
        />

        {/* NEW: Map-based Customer Location Section */}
        <Text style={styles.label}>Customer Location *</Text>
        <Text style={styles.sublabel}>Select the customer's business/office location from map for precise navigation</Text>
        
        {customerLocation.latitude ? (
          <View style={styles.locationDisplay}>
            <Icon name="location-on" size={24} color="#4CAF50" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress}>{customerLocation.address}</Text>
              <Text style={styles.locationCoords}>
                {customerLocation.latitude.toFixed(6)}, {customerLocation.longitude.toFixed(6)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowMapSelector(true)}>
              <Icon name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.locationButtonsContainer}>
            <TouchableOpacity 
              style={styles.setLocationButton} 
              onPress={() => setShowMapSelector(true)}
            >
              <Icon name="map" size={24} color="#007AFF" />
              <Text style={styles.setLocationText}>Select on Map</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.currentLocationButton} 
              onPress={useCurrentLocationForCustomer}
              disabled={autoCapturingLocation}
            >
              {autoCapturingLocation ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Icon name="my-location" size={24} color="#4CAF50" />
              )}
              <Text style={styles.currentLocationText}>
                {autoCapturingLocation ? 'Getting...' : 'Use Current'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Address (Optional)</Text>
        <Text style={styles.sublabel}>Additional address details (location above is used for GPS navigation)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter additional address details like floor, building name, etc."
          value={customerData.address}
          onChangeText={(text) => setCustomerData({ ...customerData, address: text })}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>GST Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GST number"
          value={customerData.gst}
          onChangeText={(text) => setCustomerData({ ...customerData, gst: text })}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter any additional notes"
          value={customerData.notes}
          onChangeText={(text) => setCustomerData({ ...customerData, notes: text })}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {editMode ? 'Update Customer' : 'Save Customer'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Map Address Selector Modal */}
      <Modal
        visible={showMapSelector}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MapAddressSelector
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowMapSelector(false)}
          initialLocation={customerLocation.latitude ? customerLocation : null}
        />
      </Modal>
    </ScrollView>
  );
}

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
    marginBottom: 16,
  },
  locationCapturingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  salesPersonLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  salesPersonLocationText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#4CAF50',
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  sublabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  setLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  setLocationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  currentLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F8F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});