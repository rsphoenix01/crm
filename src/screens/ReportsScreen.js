// screens/ReportsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';

export default function ReportsScreen({ navigation }) {
  const [selectedReport, setSelectedReport] = useState('daily');

  const ReportCard = ({ title, value, icon, color = '#007AFF' }) => (
    <View style={[styles.reportCard, { borderLeftColor: color }]}>
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportValue}>{value}</Text>
      </View>
      <Icon name={icon} size={40} color={color} />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.reportTabs}>
        <TouchableOpacity
          style={[styles.tabButton, selectedReport === 'daily' && styles.activeTab]}
          onPress={() => setSelectedReport('daily')}
        >
          <Text style={[styles.tabText, selectedReport === 'daily' && styles.activeTabText]}>
            Daily Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedReport === 'performance' && styles.activeTab]}
          onPress={() => setSelectedReport('performance')}
        >
          <Text style={[styles.tabText, selectedReport === 'performance' && styles.activeTabText]}>
            Performance
          </Text>
        </TouchableOpacity>
      </View>

      {selectedReport === 'daily' && (
        <View style={styles.reportContainer}>
          <Text style={styles.reportDate}>Report for: {new Date().toLocaleDateString()}</Text>
          
          <ReportCard 
            title="Customer Visits" 
            value="8" 
            icon="people" 
            color="#4CAF50" 
          />
          
          <ReportCard 
            title="New Enquiries" 
            value="3" 
            icon="add-shopping-cart" 
            color="#FF9800" 
          />
          
          <ReportCard 
            title="Orders Created" 
            value="2" 
            icon="shopping-cart" 
            color="#2196F3" 
          />
          
          <ReportCard 
            title="Distance Traveled" 
            value="45.2 km" 
            icon="directions-car" 
            color="#9C27B0" 
          />
          
          <ReportCard 
            title="Working Hours" 
            value="7h 45m" 
            icon="timer" 
            color="#FF5722" 
          />
          
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Visit Details</Text>
            <View style={styles.visitItem}>
              <Text style={styles.visitTime}>10:30 AM</Text>
              <Text style={styles.visitCustomer}>ABC Corporation</Text>
              <Text style={styles.visitDuration}>45 mins</Text>
            </View>
            <View style={styles.visitItem}>
              <Text style={styles.visitTime}>2:15 PM</Text>
              <Text style={styles.visitCustomer}>XYZ Industries</Text>
              <Text style={styles.visitDuration}>30 mins</Text>
            </View>
          </View>
        </View>
      )}

      {selectedReport === 'performance' && (
        <View style={styles.reportContainer}>
          <Text style={styles.reportPeriod}>Performance Overview - Last 30 Days</Text>
          
          <ReportCard 
            title="Total Customers Met" 
            value="124" 
            icon="people" 
            color="#4CAF50" 
          />
          
          <ReportCard 
            title="Total Enquiries" 
            value="45" 
            icon="question-answer" 
            color="#FF9800" 
          />
          
          <ReportCard 
            title="Conversion Rate" 
            value="28%" 
            icon="trending-up" 
            color="#2196F3" 
          />
          
          <ReportCard 
            title="Total Revenue" 
            value="Rs.8,45,000" 
            icon="attach-money" 
            color="#4CAF50" 
          />
          
          <ReportCard 
            title="Average Order Value" 
            value="Rs.65,000" 
            icon="assessment" 
            color="#9C27B0" 
          />
          
          <ReportCard 
            title="Tasks Completed" 
            value="38/42" 
            icon="check-circle" 
            color="#FF5722" 
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  reportTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  reportContainer: {
    padding: 15,
  },
  reportDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  reportPeriod: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 4,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reportValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  visitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  visitTime: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  visitCustomer: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    fontWeight: '500',
  },
  visitDuration: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
});
