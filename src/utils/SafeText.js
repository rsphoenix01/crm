// src/utils/SafeText.js - Safe text rendering utility
import React from 'react';
import { Text } from 'react-native';

// Safe text component that handles all edge cases
export const SafeText = ({ children, style, numberOfLines, ...props }) => {
  // Handle null/undefined
  if (children === null || children === undefined) {
    return <Text style={style} {...props}></Text>;
  }

  // Handle non-string types
  let displayText = children;
  if (typeof children !== 'string') {
    displayText = String(children);
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} {...props}>
      {displayText}
    </Text>
  );
};

// Safe currency formatter
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rs. 0';
  }
  return `Rs. ${amount.toLocaleString('en-IN')}`;
};

// Safe date formatter
export const formatDate = (date, format = 'MMM DD, YYYY') => {
  if (!date) return 'No date';
  try {
    const moment = require('moment');
    return moment(date).format(format);
  } catch (error) {
    return 'Invalid date';
  }
};

// Safe text with fallback
export const safeText = (text, fallback = '') => {
  if (text === null || text === undefined || text === '') {
    return fallback;
  }
  return String(text);
};

export default SafeText;
