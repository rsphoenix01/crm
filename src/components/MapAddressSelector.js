// components/MapAddressSelector.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function MapAddressSelector({ 
  onLocationSelect, 
  onClose, 
  initialLocation = null 
}) {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      latitude: 17.4065, // Default to Hyderabad
      longitude: 78.4772,
      address: ''
    }
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLoading(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const { latitude, longitude } = location.coords;
        const address = await reverseGeocode(latitude, longitude);
        
        const currentLocation = {
          latitude,
          longitude,
          address
        };
        
        if (!initialLocation) {
          setSelectedLocation(currentLocation);
          animateToLocation(currentLocation);
        }
      }
    } catch (error) {
      console.warn('Could not get current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result && result.length > 0) {
        const addr = result[0];
        const addressParts = [];
        if (addr.street) addressParts.push(addr.street);
        if (addr.district) addressParts.push(addr.district);
        if (addr.city) addressParts.push(addr.city);
        if (addr.region) addressParts.push(addr.region);
        return addressParts.join(', ') || 'Selected location';
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter an address to search');
      return;
    }

    try {
      setLoading(true);
      const result = await Location.geocodeAsync(searchQuery);
      
      if (result && result.length > 0) {
        const location = result[0];
        const address = await reverseGeocode(location.latitude, location.longitude);
        
        const newLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address
        };
        
        setSelectedLocation(newLocation);
        animateToLocation(newLocation);
      } else {
        Alert.alert('Not Found', 'Could not find the address. Please try a different search term.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLoading(true);
    
    const address = await reverseGeocode(latitude, longitude);
    
    const newLocation = {
      latitude,
      longitude,
      address
    };
    
    setSelectedLocation(newLocation);
    setLoading(false);
  };

  const animateToLocation = (location) => {
    if (mapRef.current && mapReady) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const confirmSelection = () => {
    if (selectedLocation.latitude && selectedLocation.longitude) {
      onLocationSelect(selectedLocation);
      onClose();
    } else {
      Alert.alert('Error', 'Please select a location on the map');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Customer Location</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search address (e.g., Cyber Towers, Hitech City)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchAddress}
        />
        <TouchableOpacity 
          onPress={searchAddress} 
          style={styles.searchButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Icon name="search" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={onMapPress}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {selectedLocation.latitude && selectedLocation.longitude && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              title="Customer Location"
              description={selectedLocation.address}
              pinColor="#007AFF"
            />
          )}
        </MapView>
        
        {/* Center crosshair indicator */}
        <View style={styles.centerMarker}>
          <Icon name="gps-fixed" size={24} color="#007AFF" />
        </View>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Getting address...</Text>
          </View>
        )}
      </View>

      {/* Selected Location Info */}
      {selectedLocation.address && (
        <View style={styles.locationInfo}>
          <Icon name="location-on" size={20} color="#4CAF50" />
          <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
        </View>
      )}

      {/* Instructions */}
      <Text style={styles.instructions}>
        Tap anywhere on the map to select the customer's exact location, or search for an address above
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.currentLocationButton} 
          onPress={getCurrentLocation}
          disabled={loading}
        >
          <Icon name="my-location" size={20} color="#007AFF" />
          <Text style={styles.currentLocationText}>Current Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={confirmSelection}
          disabled={!selectedLocation.latitude}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F0F8F0',
    borderRadius: 8,
  },
  locationAddress: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  instructions: {
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  currentLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  confirmText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});