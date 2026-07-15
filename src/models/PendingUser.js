const mongoose = require('mongoose');

// Temporarily stores user data while Stripe payment is in progress.
// Deleted once payment is verified and real User is created.
const pendingUserSchema = new mongoose.Schema(
  {
    stripeSessionId: { type: String, required: true, unique: true },
    name:            { type: String, required: true },
    email:           { type: String, required: true },
    phone:           { type: String, required: true },
    gender:          { type: String, required: true },
    hashedPassword:  { type: String, required: true },
  },
  {
    timestamps: true,
    // Auto-delete pending records after 1 hour if payment never completes
    expireAfterSeconds: 3600,
  }
);

module.exports = mongoose.model('PendingUser', pendingUserSchema);
