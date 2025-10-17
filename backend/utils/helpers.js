// utils/helpers.js
const moment = require('moment');

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

/**
 * Format duration in minutes to human readable format
 */
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Check if a date is today
 */
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
};

/**
 * Check if a date is overdue (past today)
 */
const isOverdue = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
};

/**
 * Generate order number
 */
const generateOrderNumber = async (Order) => {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (Indian)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[0-9]{10,13}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Get date range for period queries
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'thisWeek':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'last30Days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * Paginate query results
 */
const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

/**
 * Handle async errors in routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create API response format
 */
const createResponse = (success, message, data = null, pagination = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  return response;
};

module.exports = {
  calculateDistance,
  formatDuration,
  isToday,
  isOverdue,
  generateOrderNumber,
  isValidEmail,
  isValidPhone,
  getDateRange,
  paginate,
  asyncHandler,
  createResponse
};

// utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    }) + '\n';
  }

  writeToFile(filename, content) {
    const filepath = path.join(this.logDir, filename);
    fs.appendFileSync(filepath, content);
  }

  info(message, meta = {}) {
    const content = this.formatMessage('INFO', message, meta);
    console.log(content.trim());
    this.writeToFile('app.log', content);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? { 
      error: error.message, 
      stack: error.stack 
    } : {};
    const content = this.formatMessage('ERROR', message, { ...meta, ...errorMeta });
    console.error(content.trim());
    this.writeToFile('error.log', content);
  }

  warn(message, meta = {}) {
    const content = this.formatMessage('WARN', message, meta);
    console.warn(content.trim());
    this.writeToFile('app.log', content);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const content = this.formatMessage('DEBUG', message, meta);
      console.debug(content.trim());
      this.writeToFile('debug.log', content);
    }
  }
}

module.exports = new Logger();