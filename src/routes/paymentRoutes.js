const express   = require('express');
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const { createOrder, verifyAndRegister } = require('../controllers/paymentController');

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many payment attempts. Please try after 1 hour.' },
});

// POST /api/payment/create-order
// Body: { amount: 49900 }  (amount in paise — ₹499 = 49900)
router.post(
  '/create-order',
  paymentLimiter,
  [body('amount').isInt({ min: 100 }).withMessage('Amount must be at least 100 paise (₹1)')],
  createOrder
);

// POST /api/payment/verify-and-register
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, phone, gender, password }
router.post(
  '/verify-and-register',
  paymentLimiter,
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone().withMessage('Valid phone number is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female or other'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  verifyAndRegister
);

module.exports = router;
