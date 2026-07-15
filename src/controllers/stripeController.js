const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const PendingUser = require('../models/PendingUser');
const User        = require('../models/User');
const Payment     = require('../models/Payment');

const getStripe = () => require('stripe')(process.env.STRIPE_SECRET_KEY);

// Step 1: Create Stripe Checkout Session
// Hashes password, saves PendingUser, returns Stripe hosted checkout URL
exports.createCheckout = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }

    const { name, email, phone, gender, password, amount } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'payment',
      customer_email:       email,
      line_items: [
        {
          price_data: {
            currency:     'inr',
            unit_amount:  Number(amount), // in paise
            product_data: {
              name:        'Pay Platform — Registration',
              description: `Account for ${name}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&method=stripe`,
      cancel_url:  `${process.env.FRONTEND_URL}/register?cancelled=true`,
    });

    // Save pending user — deleted after verification or 1 hour expiry
    await PendingUser.create({
      stripeSessionId: session.id,
      name,
      email,
      phone,
      gender,
      hashedPassword,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

// Step 2: Verify Stripe payment + complete registration
// Called from /success page with session_id query param
exports.verifyAndRegister = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const pending = await PendingUser.findOne({ stripeSessionId: sessionId });
    if (!pending) {
      // Check if already registered (user refreshed /success page)
      const existing = await User.findOne({ email: session.customer_email });
      if (existing) {
        const token = jwt.sign(
          { id: existing._id, email: existing.email },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        return res.status(200).json({
          message: 'Already registered',
          token,
          user: {
            id: existing._id, name: existing.name, email: existing.email,
            phone: existing.phone, gender: existing.gender, paymentStatus: existing.paymentStatus,
          },
        });
      }
      return res.status(404).json({ error: 'Pending registration not found' });
    }

    // Create real user and delete pending record
    const user = await User.create({
      name:          pending.name,
      email:         pending.email,
      phone:         pending.phone,
      gender:        pending.gender,
      password:      pending.hashedPassword,
      paymentStatus: 'paid',
    });

    await PendingUser.deleteOne({ stripeSessionId: sessionId });

    // Save payment record to payments collection
    await Payment.create({
      userId:        user._id,
      gatewayName:   'Stripe',
      transactionId: session.payment_intent || sessionId,
      orderId:       sessionId,
      amount:        session.amount_total || 49900,
      currency:      (session.currency || 'inr').toUpperCase(),
      status:        'paid',
      customerEmail: pending.email,
      paidAt:        new Date(),
    });

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
