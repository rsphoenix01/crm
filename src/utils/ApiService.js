// utils/ApiService.js - Enhanced with Map-based Location Support - FIXED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.68.127:5000/api'; // Replace with your actual API URL

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token if not already available
    if (!this.token) {
      this.token = await AsyncStorage.getItem('userToken');
    }

    // Ensure proper headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    // FIXED: Proper body handling
    let body = options.body;
    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
    } else if (body && typeof body === 'string') {
      // If it's already a string, make sure it's valid JSON
      try {
        JSON.parse(body);
        // If it parses, it's already valid JSON string
      } catch (e) {
        // If it doesn't parse, it's a raw string - this shouldn't happen
        console.warn('⚠️  Raw string detected in API body:', body);
        throw new Error('Invalid JSON data format');
      }
    }

    const config = {
      method: options.method || 'GET',
      headers,
      ...(body && { body }),
    };

    // Debug log (remove in production)
    console.log('📤 API Request:', {
      url,
      method: config.method,
      headers: config.headers,
      bodyLength: body?.length || 0
    });

    try {
      const response = await fetch(url, config);
      
      // Log response status
      console.log('📥 API Response Status:', response.status, response.statusText);

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textData = await response.text();
        console.log('📄 Non-JSON Response:', textData);
        // Try to parse as JSON anyway
        try {
          data = JSON.parse(textData);
        } catch (e) {
          data = { success: false, message: textData };
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('❌ API request failed:', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  async syncDutyStatus() {
    return this.request('/attendance/sync-status', {
      method: 'POST',
      body: {}
    });
  }
  // Add these methods to your existing ApiService class

async getUserProfile() {
  return this.request('/users/profile');
}

async updateUserProfile(data) {
  return this.request('/users/profile', {
    method: 'PUT',
    body: data
  });
}

// Admin User Management
async getAllUsers() {
  return this.request('/users');
}

async createUser(userData) {
  return this.request('/users', {
    method: 'POST',
    body: userData
  });
}

async updateUser(userId, userData) {
  return this.request(`/users/${userId}`, {
    method: 'PUT',
    body: userData
  });
}

async deleteUser(userId) {
  return this.request(`/users/${userId}`, {
    method: 'DELETE'
  });
}

async getDutyStatus() {
  return this.request('/attendance/status');
}

async syncDutyStatus() {
  return this.request('/attendance/sync-status', {
    method: 'POST',
    body: {}
  });
} 

  // Helper function to validate location data before sending
  isValidLocation(location) {
    return (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180 &&
      location.address &&
      location.address.trim() !== ''
    );
  }

  // Helper function to enhance location data with defaults
  enhanceLocationData(locationData) {
    if (!locationData) return null;

    return {
      ...locationData,
      captureMethod: locationData.captureMethod || 'manual_map_selection',
      timestamp: locationData.timestamp || new Date().toISOString(),
      confidence: locationData.confidence || (
        locationData.captureMethod === 'manual_map_selection' ? 0.9 :
        locationData.captureMethod === 'gps_current' ? 0.95 :
        locationData.captureMethod === 'manual_search' ? 0.7 : 0.8
      ),
      validationStatus: locationData.validationStatus || (
        locationData.captureMethod === 'manual_map_selection' ? 'verified' : 'unverified'
      )
    };
  }
  // Add these methods to your ApiService.js class

// ADDED: Task APIs
async getTasks(type = '', filters = {}) {
  console.log('Getting tasks:', { type, filters });
  const queryParams = new URLSearchParams({ type, ...filters }).toString();
  return this.request(`/tasks?${queryParams}`);
}

async createTask(taskData) {
  if (!taskData || typeof taskData !== 'object') {
    throw new Error('Invalid task data format');
  }
  return this.request('/tasks', {
    method: 'POST',
    body: taskData,
  });
}

async updateTask(taskId, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Invalid update data format');
  }
  return this.request(`/tasks/${taskId}`, {
    method: 'PUT',
    body: updates,
  });
}

async deleteTask(taskId) {
  return this.request(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

async getTaskById(taskId) {
  return this.request(`/tasks/${taskId}`);
}

// ADDED: Leave APIs
async getLeaves(filters = {}) {
  console.log('Getting leaves:', filters);
  const queryParams = new URLSearchParams(filters).toString();
  return this.request(`/leaves?${queryParams}`);
}

async createLeave(leaveData) {
  if (!leaveData || typeof leaveData !== 'object') {
    throw new Error('Invalid leave data format');
  }
  return this.request('/leaves', {
    method: 'POST',
    body: leaveData,
  });
}

async updateLeave(leaveId, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Invalid update data format');
  }
  return this.request(`/leaves/${leaveId}`, {
    method: 'PUT',
    body: updates,
  });
}

async getLeaveBalance(userId = null) {
  const endpoint = userId ? `/leaves/balance/${userId}` : '/leaves/balance';
  return this.request(endpoint);
}

// ADDED: Attendance APIs (for the duty toggle)
async markAttendance(attendanceData) {
  if (!attendanceData || typeof attendanceData !== 'object') {
    throw new Error('Invalid attendance data format');
  }
  if (attendanceData.location) {
    attendanceData.location = this.enhanceLocationData(attendanceData.location);
  }
  return this.request('/attendance', {
    method: 'POST',
    body: attendanceData,
  });
}

  async refreshToken() {
    try {
      this.token = await AsyncStorage.getItem('userToken');
      return this.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  // Authentication APIs - FIXED
  async login(credentials) {
    // Validate input
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('Invalid credentials format');
    }
    
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    const response = await this.request('/auth/login', {
      method: 'POST',
      body: credentials, // Pass object directly, will be stringified in request()
    });
    
    if (response.success && response.token) {
      this.token = response.token;
      await AsyncStorage.setItem('userToken', response.token);
    }
    
    return response;
  }

  async register(userData) {
    if (!userData || typeof userData !== 'object') {
      throw new Error('Invalid user data format');
    }

    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  // Add this method to your ApiService.js
  async logout() {
    try {
      this.token = null;
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('dutyStatus');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  // Location-aware User APIs - FIXED
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ADDED: Get Dashboard Stats
  async getDashboardStats() {
    console.log('📊 Getting dashboard stats...');
    try {
      return this.request('/reports/dashboard');
    } catch (error) {
      console.error('❌ Get dashboard stats failed:', error);
      // Return default stats in case of error
      return {
        success: false,
        stats: {
          todayCustomers: 0,
          pendingEnquiries: 0,
          todayOrders: 0,
          monthlyRevenue: 0,
          pendingTasks: 0,
          dutyStatus: 'off',
          workingHours: 0,
          distanceTraveled: 0
        }
      };
    }
  }

  // ADDED: Get Duty Status - Updated for Dashboard compatibility
  async getDutyStatus() {
    console.log('👤 Getting duty status...');
    try {
      // Get user info and today's attendance
      const [userResponse, attendanceResponse] = await Promise.all([
        this.getCurrentUser(),
        this.getAttendance({ 
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
      ]);

      const user = userResponse.user;
      const todayAttendance = attendanceResponse.attendance?.[0];

      // Determine if currently on duty
      const isOnDuty = user?.dutyStatus === true || user?.dutyStatus === 'on';

      // Calculate session info from today's attendance
      let totalSessions = 0;
      let totalHours = 0;
      let currentSession = null;

      if (todayAttendance) {
        // For current backend: one session per day
        if (todayAttendance.dutyStartTime) {
          totalSessions = 1;
          totalHours = todayAttendance.totalHours || 0;
          
          if (isOnDuty && todayAttendance.dutyStartTime && !todayAttendance.dutyEndTime) {
            // Currently in active session
            currentSession = {
              startTime: todayAttendance.dutyStartTime,
              startLocation: todayAttendance.dutyStartLocation
            };
          }
        }
      }

      return {
        success: true,
        isOnDuty,
        totalSessions,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        currentSession,
        user: user
      };
    } catch (error) {
      console.error('❌ Get duty status failed:', error);
      return {
        success: false,
        isOnDuty: false,
        totalSessions: 0,
        totalHours: 0,
        currentSession: null
      };
    }
  }

  async updateUserLocation(locationData) {
    const enhancedLocation = this.enhanceLocationData(locationData);
    return this.request('/auth/location', {
      method: 'POST',
      body: enhancedLocation,
    });
  }

  async updateDutyStatus(dutyStatus, location = null) {
    const enhancedLocation = location ? this.enhanceLocationData(location) : null;
    
    // Convert boolean to expected backend format
    const statusValue = dutyStatus === true || dutyStatus === 'on' ? true : false;
    
    return this.request('/auth/duty-status', {
      method: 'POST',
      body: { dutyStatus: statusValue, location: enhancedLocation },
    });
  }

  // Enhanced Customer APIs with Map Location Support - FIXED
  async getCustomers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/customers?${queryParams}`);
  }

  async createCustomer(customerData) {
    // Validate input
    if (!customerData || typeof customerData !== 'object') {
      throw new Error('Invalid customer data format');
    }

    // Enhanced location validation and processing
    if (!customerData.location) {
      throw new Error('Customer location is required');
    }

    if (!this.isValidLocation(customerData.location)) {
      throw new Error('Invalid customer location coordinates or address');
    }

    // Enhance location data with map-specific defaults
    const enhancedCustomerData = {
      ...customerData,
      location: this.enhanceLocationData(customerData.location),
      salesPersonLocation: customerData.salesPersonLocation ? 
        this.enhanceLocationData(customerData.salesPersonLocation) : null
    };

    // Validate salesPersonLocation if provided
    if (enhancedCustomerData.salesPersonLocation && 
        !this.isValidLocation(enhancedCustomerData.salesPersonLocation)) {
      throw new Error('Invalid sales person location coordinates');
    }

    return this.request('/customers', {
      method: 'POST',
      body: enhancedCustomerData,
    });
  }

  async updateCustomer(customerId, updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid update data format');
    }

    // Enhanced location validation for updates
    if (updates.location) {
      if (!this.isValidLocation(updates.location)) {
        throw new Error('Invalid customer location coordinates or address');
      }
      updates.location = this.enhanceLocationData(updates.location);
    }

    if (updates.salesPersonLocation) {
      if (!this.isValidLocation(updates.salesPersonLocation)) {
        throw new Error('Invalid sales person location coordinates');
      }
      updates.salesPersonLocation = this.enhanceLocationData(updates.salesPersonLocation);
    }

    return this.request(`/customers/${customerId}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async getCustomerById(customerId) {
    return this.request(`/customers/${customerId}`);
  }

  async deleteCustomer(customerId) {
    return this.request(`/customers/${customerId}`, {
      method: 'DELETE',
    });
  }

  // Enhanced nearby customers search with better filtering
  async getNearbyCustomers(latitude, longitude, radiusKm = 10, additionalFilters = {}) {
    if (!this.isValidLocation({ latitude, longitude, address: 'temp' })) {
      throw new Error('Invalid coordinates for nearby search');
    }

    const params = {
      nearBy: radiusKm,
      latitude: latitude,
      longitude: longitude,
      ...additionalFilters
    };

    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/customers?${queryParams}`);
  }

  // NEW: Get location method analytics
  async getLocationAnalytics() {
    return this.request('/customers/analytics/location-methods');
  }

  // Enquiry APIs with Enhanced Location Support - FIXED
  async getEnquiries(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/enquiries?${queryParams}`);
  }

  async createEnquiry(enquiryData) {
    if (!enquiryData || typeof enquiryData !== 'object') {
      throw new Error('Invalid enquiry data format');
    }

    // Validate and enhance sales person location if provided
    if (enquiryData.salesPersonLocation) {
      if (!this.isValidLocation(enquiryData.salesPersonLocation)) {
        throw new Error('Invalid sales person location coordinates');
      }
      enquiryData.salesPersonLocation = this.enhanceLocationData(enquiryData.salesPersonLocation);
    }

    return this.request('/enquiries', {
      method: 'POST',
      body: enquiryData,
    });
  }

  async updateEnquiry(enquiryId, updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid update data format');
    }

    console.log('📤 Updating enquiry:', enquiryId);

    // Remove salesPersonLocation for updates
    const { salesPersonLocation, ...updatesWithoutLocation } = updates;

    return this.request(`/enquiries/${enquiryId}`, {
      method: 'PUT',
      body: updatesWithoutLocation,
    });
  }

  async deleteEnquiry(enquiryId) {
    console.log('🗑️ Deleting enquiry:', enquiryId);
    return this.request(`/enquiries/${enquiryId}`, {
      method: 'DELETE',
    });
  }

  // Order APIs - UPDATED to not require delivery location
async createOrder(orderData) {
  if (!orderData || typeof orderData !== 'object') {
    throw new Error('Invalid order data format');
  }

  console.log('📤 Creating order:', orderData);

  // REMOVED: Delivery location validation - backend handles it automatically from customer data
  // The backend will fetch customer location and use it as delivery location

  return this.request('/orders', {
    method: 'POST',
    body: orderData,
  });
}

async updateOrder(orderId, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Invalid update data format');
  }

  console.log('📤 Updating order:', orderId);

  return this.request(`/orders/${orderId}`, {
    method: 'PUT',
    body: updates,
  });
}

async deleteOrder(orderId) {
  console.log('🗑️ Deleting order:', orderId);
  return this.request(`/orders/${orderId}`, {
    method: 'DELETE',
  });
}

async getOrders(filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  return this.request(`/orders?${queryParams}`);
}

async getOrderById(orderId) {
  return this.request(`/orders/${orderId}`);
}

async addPayment(orderId, paymentData) {
  return this.request(`/orders/${orderId}/payments`, {
    method: 'POST',
    body: paymentData,
  });
}
  // Check-in APIs with Enhanced Location Support - FIXED
  async checkIn(checkInData) {
    if (!checkInData || typeof checkInData !== 'object') {
      throw new Error('Invalid check-in data format');
    }

    if (!checkInData.checkInLocation || !this.isValidLocation(checkInData.checkInLocation)) {
      throw new Error('Valid check-in location is required');
    }

    const enhancedCheckInData = {
      ...checkInData,
      checkInLocation: this.enhanceLocationData(checkInData.checkInLocation)
    };

    return this.request('/checkins', {
      method: 'POST',
      body: enhancedCheckInData,
    });
  }

  async checkOut(checkInId, checkOutData = {}) {
    if (typeof checkOutData !== 'object') {
      throw new Error('Invalid check-out data format');
    }

    if (checkOutData.checkOutLocation && !this.isValidLocation(checkOutData.checkOutLocation)) {
      throw new Error('Invalid check-out location coordinates');
    }

    if (checkOutData.checkOutLocation) {
      checkOutData.checkOutLocation = this.enhanceLocationData(checkOutData.checkOutLocation);
    }

    return this.request(`/checkins/${checkInId}/checkout`, {
      method: 'POST',
      body: checkOutData,
    });
  }

  async getCheckIns(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/checkins?${queryParams}`);
  }

  // Product APIs - FIXED
  async getProducts() {
    return this.request('/products');
  }

  async createProduct(productData) {
    if (!productData || typeof productData !== 'object') {
      throw new Error('Invalid product data format');
    }

    return this.request('/products', {
      method: 'POST',
      body: productData,
    });
  }

  // Report APIs
  async getReports(type, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/reports/${type}?${queryParams}`);
  }

  // User management APIs - FIXED
  async getAllUsers() {
    return this.request('/users');
  }

  async updateUser(userId, updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid update data format');
    }

    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: updates,
    });
  }

  // NEW: Geocoding helper methods for map integration
  async geocodeAddress(address) {
    // This would typically call your backend geocoding service
    // For now, we'll use Expo's geocoding in the components
    throw new Error('Geocoding should be handled by LocationService');
  }

  async reverseGeocode(latitude, longitude) {
    // This would typically call your backend reverse geocoding service
    // For now, we'll use Expo's reverse geocoding in the components
    throw new Error('Reverse geocoding should be handled by LocationService');
  }

  // ADDED: Attendance APIs
  async getAttendance(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/attendance?${queryParams}`);
  }

  async markAttendance(attendanceData) {
    console.log('📅 Marking attendance:', attendanceData);
    
    if (!attendanceData || typeof attendanceData !== 'object') {
      throw new Error('Invalid attendance data format');
    }

    // If location data is provided, enhance it
    if (attendanceData.location) {
      attendanceData.location = this.enhanceLocationData(attendanceData.location);
    }

    try {
      const response = await this.request('/attendance', {
        method: 'POST',
        body: attendanceData,
      });

      // Enhanced response for dashboard compatibility
      if (response.success && attendanceData.action === 'start') {
        return {
          ...response,
          sessionNumber: 1, // Current backend supports one session per day
          message: response.message || 'Duty started successfully'
        };
      }

      if (response.success && attendanceData.action === 'end') {
        // Calculate session duration if possible
        let duration = 0;
        if (response.attendance?.dutyStartTime && response.attendance?.dutyEndTime) {
          const start = new Date(response.attendance.dutyStartTime);
          const end = new Date(response.attendance.dutyEndTime);
          duration = Math.round((end - start) / (1000 * 60 * 60) * 10) / 10; // Hours rounded to 1 decimal
        }

        return {
          ...response,
          completedSession: {
            duration: duration,
            startTime: response.attendance?.dutyStartTime,
            endTime: response.attendance?.dutyEndTime
          },
          totalSessionsToday: 1, // Current backend supports one session per day
          totalHoursToday: response.attendance?.totalHours || duration || 0,
          message: response.message || 'Duty ended successfully'
        };
      }

      return response;
    } catch (error) {
      // Enhanced error handling for dashboard
      if (error.message.includes('Duty already started')) {
        const enhancedError = new Error('You already have an active duty session today. Please end it first before starting a new one.');
        enhancedError.code = 'DUTY_ALREADY_ACTIVE';
        throw enhancedError;
      }

      if (error.message.includes('Duty not started')) {
        const enhancedError = new Error('No active duty session found to end.');
        enhancedError.code = 'NO_ACTIVE_SESSION';
        throw enhancedError;
      }

      throw error;
    }
  }

  async startDuty(locationData = null) {
    console.log('🟢 Starting duty...');
    
    const dutyData = {
      action: 'start',
      location: locationData ? this.enhanceLocationData(locationData) : null,
      timestamp: new Date().toISOString()
    };

    return this.request('/attendance', {
      method: 'POST',
      body: dutyData,
    });
  }

  async endDuty(locationData = null) {
    console.log('🔴 Ending duty...');
    
    const dutyData = {
      action: 'end',
      location: locationData ? this.enhanceLocationData(locationData) : null,
      timestamp: new Date().toISOString()
    };

    return this.request('/attendance', {
      method: 'POST',
      body: dutyData,
    });
  }
}

export default new ApiService();