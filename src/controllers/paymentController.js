const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User      = require('../models/User');
const Payment   = require('../models/Payment');

// Initialized lazily so .env is loaded before this runs
const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Step 1: Create a Razorpay order
// Frontend calls this first to get an orderId, then opens the payment popup
exports.createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }

    const { amount } = req.body; // amount in paise (e.g. 49900 = ₹499)

    const options = {
      amount:   Number(amount),
      currency: 'INR',
      receipt:  `receipt_${Date.now()}`,
    };

    const order = await getRazorpay().orders.create(options);

    res.status(200).json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
};

// Step 2: Verify payment + Register user
// Called after user completes payment on frontend
exports.verifyAndRegister = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      email,
      phone,
      gender,
      password,
    } = req.body;

    // Cryptographic signature verification — ensures payment is real
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Payment is verified — now register the user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({
      name,
      email,
      phone,
      gender,
      password:      hashed,
      paymentStatus: 'paid',
    });

    // Save payment record to payments collection
    await Payment.create({
      userId:        user._id,
      gatewayName:   'Razorpay',
      transactionId: razorpay_payment_id,
      orderId:       razorpay_order_id,
      amount:        49900,
      currency:      'INR',
      status:        'paid',
      customerEmail: email,
      paidAt:        new Date(),
    });

    // Generate JWT so user is instantly logged in after payment
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Payment successful. Registration complete.',
      token,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        phone:         user.phone,
        gender:        user.gender,
        paymentStatus: user.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};
