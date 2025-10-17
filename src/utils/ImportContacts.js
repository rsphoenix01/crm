import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

class ImportContacts {
  static async requestContactsPermission() {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  static async importFromCallLog(phoneNumber) {
    // Expo doesn't have call log access, but we can search contacts
    return this.importFromPhone(phoneNumber);
  }

  static async importFromPhone(phoneNumber) {
    const hasPermission = await this.requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot import contact without permission.');
      return null;
    }

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      const contact = data.find(c => 
        c.phoneNumbers?.some(p => p.number?.includes(phoneNumber))
      );

      if (contact) {
        return {
          name: contact.name || phoneNumber,
          phone: phoneNumber,
          email: contact.emails?.[0]?.email || '',
        };
      }

      return {
        name: phoneNumber,
        phone: phoneNumber,
        email: '',
      };
    } catch (error) {
      console.error('Error importing contact:', error);
      return null;
    }
  }

  static async getAllContacts() {
    const hasPermission = await this.requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot access contacts without permission.');
      return [];
    }

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      return data.map(contact => ({
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email || '',
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }
}

export default ImportContacts;
