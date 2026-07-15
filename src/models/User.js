const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:         { type: String, required: true, trim: true },
    gender:        { type: String, required: true, enum: ['male', 'female', 'other'] },
    password:      { type: String, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
