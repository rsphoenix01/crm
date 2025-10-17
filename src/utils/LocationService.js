import * as Location from 'expo-location';

class LocationService {
  static async requestPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

 // Get current location with full address
static async getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Get address from coordinates
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const addr = address[0];
    const fullAddress = [
      addr.name,
      addr.street,
      addr.city,
      addr.region,
      addr.postalCode,
      addr.country
    ].filter(Boolean).join(', ');

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address: fullAddress || 'Address not available',
      city: addr.city || '',
      state: addr.region || '',
      pincode: addr.postalCode || '',
      addressComponents: {
        city: addr.city || '',
        state: addr.region || '',
        pincode: addr.postalCode || '',
        country: addr.country || ''
      },
      captureMethod: 'gps',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Get current location error:', error);
    throw error;
  }
}

  static async reverseGeocode(latitude, longitude) {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        return {
          formattedAddress: [
            addr.name,
            addr.street,
            addr.city,
            addr.region,
            addr.postalCode,
            addr.country
          ].filter(Boolean).join(', '),
          components: {
            name: addr.name,
            street: addr.street,
            city: addr.city,
            region: addr.region,
            postalCode: addr.postalCode,
            country: addr.country
          }
        };
      }
      
      return {
        formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        components: {}
      };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return {
        formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        components: {}
      };
    }
  }

  static async getCurrentLocationWithAddress() {
    try {
      const location = await this.getCurrentLocation();
      const addressInfo = await this.reverseGeocode(location.latitude, location.longitude);
      
      return {
        ...location,
        address: addressInfo.formattedAddress,
        addressComponents: addressInfo.components
      };
    } catch (error) {
      console.error('Get location with address error:', error);
      throw error;
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  static isLocationValid(location) {
    return location && 
           typeof location.latitude === 'number' && 
           typeof location.longitude === 'number' &&
           !isNaN(location.latitude) && 
           !isNaN(location.longitude) &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }
}

export default LocationService;
