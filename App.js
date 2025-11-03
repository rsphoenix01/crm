// App.js - Fixed Socket.IO for React Native compatibility
import React, { useState, useEffect, createContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import ApiService from './src/utils/ApiService';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CustomersScreen from './src/screens/CustomerScreen';
import AddCustomerScreen from './src/screens/AddCustomerScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import EnquiriesScreen from './src/screens/EnquiriesScreen';
import AddEnquiryScreen from './src/screens/AddEnquiryScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AddOrderScreen from './src/screens/AddOrderScreen';
import TasksScreen from './src/screens/TasksScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import AddUserScreen from './src/screens/AddUserScreen';
import EditUserScreen from './src/screens/EditUserScreen';

// Create AuthContext for ProfileScreen
export const AuthContext = createContext();

// IMPORTANT: Replace with your computer's actual IP address!
// Find it using: ipconfig (Windows) or ifconfig (Mac/Linux)
const SOCKET_URL = 'http://192.168.68.128:5000';

// Global socket instance
export let socket = null;

const initializeSocket = (userId) => {
  if (!socket) {
    console.log('Initializing socket connection to:', SOCKET_URL);
    
    socket = io(SOCKET_URL, {
      // Enable multiple transports for better compatibility
      transports: ['polling', 'websocket'],
      
      // Force polling first, then upgrade to websocket
      upgrade: true,
      
      // Increase timeout for mobile networks
      timeout: 10000,
      
      // Auto-connect set to false initially
      autoConnect: false,
      
      // Additional options for React Native compatibility
      forceNew: true,
      
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully:', socket.id);
      console.log('Transport:', socket.io.engine.transport.name);
      
      if (userId) {
        socket.emit('join', userId);
        console.log('👤 User joined room:', userId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('🔴 Socket connection error:', error.message);
      console.log('Trying to connect to:', SOCKET_URL);
      
      // Try to provide helpful error messages
      if (error.message.includes('websocket error')) {
        console.log('💡 Tip: Check if your backend server is running and IP address is correct');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
      console.log('🔴 Socket reconnection error:', error.message);
    });

    // Transport change events
    socket.io.on('upgrade', () => {
      console.log('⬆️ Upgraded to transport:', socket.io.engine.transport.name);
    });
  }

  // Connect the socket
  if (userId && !socket.connected) {
    console.log('🔌 Attempting to connect socket...');
    socket.connect();
  }

  return socket;
};

const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ onLogout, user }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'Customers') iconName = 'people';
          else if (route.name === 'Enquiries') iconName = 'question-answer';
          else if (route.name === 'Orders') iconName = 'shopping-cart';
          else if (route.name === 'Tasks') iconName = 'assignment';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Enquiries" component={EnquiriesScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
    </Tab.Navigator>
  );
}

// Main Stack for logged in users
function MainStack({ onLogout, user }) {
  return (
    <AuthContext.Provider value={{ user, logout: onLogout }}>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          options={{ headerShown: false }}
        >
          {(props) => <MainTabs {...props} onLogout={onLogout} user={user} />}
        </Stack.Screen>
        <Stack.Screen 
          name="AddCustomer" 
          component={AddCustomerScreen}
          options={{ 
            title: 'Add Customer',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="CustomerDetail" 
          component={CustomerDetailScreen}
          options={{ 
            title: 'Customer Details',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="AddEnquiry" 
          component={AddEnquiryScreen}
          options={{ 
            title: 'Add Enquiry',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <Stack.Screen 
          name="AddOrder" 
          component={AddOrderScreen}
          options={{ 
            title: 'Add Order',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        
<Stack.Screen 
  name="UserManagement" 
  component={UserManagementScreen}
  options={{ 
    title: 'User Management',
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
/>
<Stack.Screen 
  name="AddUser" 
  component={AddUserScreen}
  options={{ 
    title: 'Add User',
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
/>
<Stack.Screen 
  name="EditUser" 
  component={EditUserScreen}
  options={{ 
    title: 'Edit User',
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
/>
        <Stack.Screen 
          name="Reports" 
          component={ReportsScreen}
          options={{ 
            title: 'Reports',
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
       <Stack.Screen 
  name="Profile"
  options={{ 
    title: 'Profile',
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
>
  {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
</Stack.Screen>
      </Stack.Navigator>
    </AuthContext.Provider>
  );
}

// App.js - Add this TEMPORARY code to clear old tokens
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // TEMPORARY: Force clear storage to remove mock token
    const clearAndCheck = async () => {
      console.log('🧹 Clearing old tokens...');
      await AsyncStorage.clear();
      checkLoginStatus();
    };
    
    clearAndCheck();
    
    // REMOVE THE LINE BELOW - it's commented out now
    // checkLoginStatus();
  }, []);

// Replace your checkLoginStatus function with this TEMPORARILY

const checkLoginStatus = async () => {
  try {
    console.log('🔍 Checking login status...');
    
    // Check for existing token and user data
    const token = await AsyncStorage.getItem('userToken');
    const userDataString = await AsyncStorage.getItem('userData');
    
    if (token && userDataString) {
      console.log('✅ Found existing session');
      
      const user = JSON.parse(userDataString);
      console.log('👤 User:', user.email, 'Role:', user.role);
      
      // Set token in ApiService
      ApiService.setToken(token);
      
      // Update state
      setUserData(user);
      setIsLoggedIn(true);
      
      // Initialize socket
      initializeSocket(user.id || user._id);
      
      console.log('✅ Session restored successfully');
    } else {
      console.log('ℹ️ No existing session found');
      setIsLoggedIn(false);
      setUserData(null);
    }
    
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    setIsLoggedIn(false);
    setUserData(null);
  } finally {
    setIsLoading(false);
  }
};
  // ... rest of your App.js code stays the same

  const handleLogin = async (user) => {
    try {
      console.log('🔐 handleLogin called with user:', user);
      console.log('👤 User role:', user.role);
      
      // IMPORTANT: Save to AsyncStorage first
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      console.log('💾 User data saved to AsyncStorage');
      
      // Update state
      setUserData(user);
      setIsLoggedIn(true);
      
      // Initialize socket with correct ID (handle both id and _id)
      const userId = user.id || user._id;
      console.log('🔌 Initializing socket for user ID:', userId);
      initializeSocket(userId);
      
      console.log('✅ Login completed successfully');
    } catch (error) {
      console.error('❌ Error in handleLogin:', error);
    }
  };
  const handleLogout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear token from ApiService
      await ApiService.logout();
      
      // Disconnect socket
      disconnectSocket();
      
      // Clear all AsyncStorage items
      await AsyncStorage.multiRemove([
        'userToken', 
        'userData', 
        'dutyStatus', 
        'dutyStartTime', 
        'dutyEndTime', 
        'dutyStartLocation'
      ]);
      
      console.log('👋 Logout completed successfully');
      
      // Update app state
      setIsLoggedIn(false);
      setUserData(null);
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if there's an error, still clear the state
      disconnectSocket();
      setIsLoggedIn(false);
      setUserData(null);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isLoggedIn ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <MainStack onLogout={handleLogout} user={userData} />
      )}
    </NavigationContainer>
  );
}