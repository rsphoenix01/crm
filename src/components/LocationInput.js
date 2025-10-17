import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function LocationInput({ 
  label = "Location", 
  value, 
  onLocationChange, 
  required = false, 
  placeholder = "Tap to get current location"
}) {
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState(value || {
    latitude: null,
    longitude: null,
    address: ''
  });

  useEffect(() => {
    if (value) {
      setLocationData(value);
    }
  }, [value]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to capture your current location. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocoding to get address
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        let address = '';
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = [
            addr.name,
            addr.street,
            addr.city,
            addr.region,
            addr.postalCode,
            addr.country
          ].filter(Boolean).join(', ');
        }

        const newLocationData = {
          latitude,
          longitude,
          address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toISOString()
        };

        setLocationData(newLocationData);
        onLocationChange(newLocationData);

      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        
        // If reverse geocoding fails, just use coordinates
        const newLocationData = {
          latitude,
          longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toISOString()
        };

        setLocationData(newLocationData);
        onLocationChange(newLocationData);
      }

    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please ensure location services are enabled and try again.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: () => getCurrentLocation() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (text) => {
    const updatedLocationData = {
      ...locationData,
      address: text
    };
    setLocationData(updatedLocationData);
    onLocationChange(updatedLocationData);
  };

  const clearLocation = () => {
    const clearedLocationData = {
      latitude: null,
      longitude: null,
      address: ''
    };
    setLocationData(clearedLocationData);
    onLocationChange(clearedLocationData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <View style={styles.locationContainer}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            locationData.latitude && styles.locationButtonActive
          ]}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Icon 
              name={locationData.latitude ? "my-location" : "location-on"} 
              size={24} 
              color={locationData.latitude ? "#4CAF50" : "#007AFF"} 
            />
          )}
          <Text style={[
            styles.locationButtonText,
            locationData.latitude && styles.locationButtonTextActive
          ]}>
            {loading ? 'Getting Location...' : 
             locationData.latitude ? 'Location Captured' : 'Get Current Location'}
          </Text>
        </TouchableOpacity>

        {locationData.latitude && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearLocation}
          >
            <Icon name="clear" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.addressInput}
        placeholder={placeholder}
        value={locationData.address}
        onChangeText={handleAddressChange}
        multiline
        numberOfLines={2}
      />

      {locationData.latitude && (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesText}>
            📍 Lat: {locationData.latitude.toFixed(6)}, Lng: {locationData.longitude.toFixed(6)}
          </Text>
          {locationData.timestamp && (
            <Text style={styles.timestampText}>
              Captured: {new Date(locationData.timestamp).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  locationButtonActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  locationButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  locationButtonTextActive: {
    color: '#4CAF50',
  },
  clearButton: {
    marginLeft: 10,
    padding: 8,
  },
  addressInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 50,
  },
  coordinatesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  timestampText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});
