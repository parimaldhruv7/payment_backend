const express   = require('express');
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const { createCheckout, verifyAndRegister } = require('../controllers/stripeController');

const router = express.Router();

const stripeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many payment attempts. Please try after 1 hour.' },
});

// POST /api/stripe/create-checkout
router.post(
  '/create-checkout',
  stripeLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('amount').isInt({ min: 100 }).withMessage('Amount must be at least 100 paise'),
  ],
  createCheckout
);

// POST /api/stripe/verify
router.post('/verify', stripeLimiter, verifyAndRegister);

module.exports = router;
