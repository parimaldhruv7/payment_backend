const express     = require('express');
const rateLimit   = require('express-rate-limit');
const { body }    = require('express-validator');
const { register, login, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // max 10 registrations per IP per hour
  message: { error: 'Too many accounts created. Please try after 1 hour.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 login attempts per IP
  message: { error: 'Too many login attempts. Please try after 15 minutes.' },
});

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']).withMessage('Invalid payment status'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes
router.post('/register', registerLimiter, registerValidation, register);
router.post('/login',    loginLimiter,    loginValidation,    login);

// Protected route — requires JWT token
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
