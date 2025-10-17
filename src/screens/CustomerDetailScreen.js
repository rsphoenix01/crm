// CustomerDetailScreen.js - With Call, Email, Navigate features
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customer } = route.params;

  useEffect(() => {
    navigation.setOptions({
      title: customer.name || 'Customer Details',
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('AddCustomer', { editMode: true, customer })}>
          <Icon name="edit" size={24} color="#007AFF" style={{ marginRight: 15 }} />
        </TouchableOpacity>
      ),
    });
  }, []);

  const makeCall = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const sendEmail = () => {
    if (customer.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const openMaps = () => {
    if (customer.location?.latitude && customer.location?.longitude) {
      const { latitude, longitude } = customer.location;
      const url = Platform.select({
        ios: `maps:0,0?q=${customer.name}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${customer.name})`
      });
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Customer Info Card */}
      <View style={styles.customerCard}>
        <Text style={styles.customerName}>{customer.name || 'Unknown Customer'}</Text>
        
        {customer.contactPerson && (
          <View style={styles.infoRow}>
            <Icon name="person" size={20} color="#666" />
            <Text style={styles.customerInfo}>{customer.contactPerson}</Text>
          </View>
        )}
        
        {customer.phone && (
          <TouchableOpacity style={styles.infoRow} onPress={makeCall}>
            <Icon name="phone" size={20} color="#007AFF" />
            <Text style={[styles.customerInfo, { color: '#007AFF' }]}>{customer.phone}</Text>
          </TouchableOpacity>
        )}
        
        {customer.email && (
          <TouchableOpacity style={styles.infoRow} onPress={sendEmail}>
            <Icon name="email" size={20} color="#007AFF" />
            <Text style={[styles.customerInfo, { color: '#007AFF' }]}>{customer.email}</Text>
          </TouchableOpacity>
        )}
        
        {customer.location?.address && (
          <TouchableOpacity style={styles.infoRow} onPress={openMaps}>
            <Icon name="location-on" size={20} color="#007AFF" />
            <Text style={[styles.customerInfo, { color: '#007AFF' }]} numberOfLines={2}>
              {customer.location.address}
            </Text>
          </TouchableOpacity>
        )}
        
        {customer.gstin && (
          <View style={styles.infoRow}>
            <Icon name="business" size={20} color="#666" />
            <Text style={styles.customerInfo}>GSTIN: {customer.gstin}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {customer.phone && (
          <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={makeCall}>
            <Icon name="phone" size={24} color="white" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        )}
        
        {customer.email && (
          <TouchableOpacity style={[styles.actionButton, styles.emailButton]} onPress={sendEmail}>
            <Icon name="email" size={24} color="white" />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        )}
        
        {customer.location?.latitude && customer.location?.longitude && (
          <TouchableOpacity style={[styles.actionButton, styles.mapButton]} onPress={openMaps}>
            <Icon name="directions" size={24} color="white" />
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Information */}
      {customer.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.notesText}>{customer.notes}</Text>
          </View>
        </View>
      )}

      {/* Customer Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{customer.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>₹{(customer.totalRevenue || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customerCard: {
    backgroundColor: 'white',
    padding: 20,
    margin: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerInfo: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  emailButton: {
    backgroundColor: '#FF9800',
  },
  mapButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionContent: {
    padding: 15,
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});