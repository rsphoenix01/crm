// screens/LoginScreen.js - FIXED to use real ApiService
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../utils/ApiService'; // Import the real ApiService

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('🔐 LoginScreen: Starting login process...');
      console.log('📧 Email:', email);
      console.log('🔒 Password length:', password.length);
      
      // FIXED: Use real ApiService with proper credentials object
      const credentials = {
        email: email.trim(),
        password: password
      };
      
      console.log('📤 Calling ApiService.login with:', credentials);
      
      // Call the real ApiService.login method
      const response = await ApiService.login(credentials);
      
      console.log('📥 Login response:', response);
      
      if (response.success) {
        // Store user data
        await AsyncStorage.setItem('userToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        
        console.log('✅ Login successful, calling onLogin...');
        
        // Call the onLogin function from props with user data
        onLogin(response.user);
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Login Error', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your administrator for password reset.');
  };

  // Test login credentials for development
  const fillTestCredentials = () => {
    setEmail('test@demo.com');
    setPassword('password123');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.loginContainer}>
        <Text style={styles.title}>Field Sales CRM</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />
        
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin} 
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Development helper - remove in production */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={fillTestCredentials}
          >
            <Text style={styles.testButtonText}>Fill Test Credentials</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    height: 55,
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: 20,
    color: '#007AFF',
    fontSize: 16,
  },
  // Development helper styles
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
  },
});