// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email');

const passwordValidation = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

const phoneValidation = body('phone')
  .isMobilePhone()
  .withMessage('Please provide a valid phone number');

// Validation for user registration
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  emailValidation,
  passwordValidation,
  phoneValidation,
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'executive'])
    .withMessage('Invalid role')
];

// Validation for user login
const validateUserLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation for customer creation
const validateCustomer = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('gst')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number')
];

// Validation for task creation
const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Task title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('priority')
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be Low, Medium, or High'),
  body('assigneeId')
    .isMongoId()
    .withMessage('Please provide a valid assignee'),
  body('dueDate')
    .isISO8601()
    .withMessage('Please provide a valid due date')
];

// Validation for enquiry creation
const validateEnquiry = [
  body('customer')
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),
  body('products.*.product')
    .isMongoId()
    .withMessage('Please provide valid product IDs'),
  body('products.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('products.*.rate')
    .isFloat({ min: 0 })
    .withMessage('Rate must be a positive number'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid follow-up date')
];

// Middleware to handle validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateCustomer,
  validateTask,
  validateEnquiry,
  handleValidation
};