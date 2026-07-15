const bcrypt            = require('bcryptjs');
const jwt               = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User              = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }

    const { name, email, phone, gender, password, paymentStatus } = req.body;

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
      password: hashed,
      paymentStatus: paymentStatus || 'pending',
    });

    res.status(201).json({
      message: 'Registration successful',
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

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
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

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};
