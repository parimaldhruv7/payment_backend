const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    gatewayName: {
      type:     String,
      required: true,
      enum:     ['Razorpay', 'Stripe'],
    },
    transactionId: {
      type:     String,
      required: true,
      unique:   true, // razorpay_payment_id or stripe payment_intent id
    },
    orderId: {
      type: String, // razorpay_order_id or stripe session id
    },
    amount: {
      type:     Number,
      required: true, // in paise (49900 = ₹499)
    },
    currency: {
      type:    String,
      default: 'INR',
    },
    status: {
      type:    String,
      enum:    ['paid', 'failed', 'pending'],
      default: 'paid',
    },
    customerEmail: {
      type: String,
    },
    paidAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
