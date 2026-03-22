const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  portfolio: {
    balance: { type: Number, default: 100000 }, // Virtual balance USDT
    totalPnl: { type: Number, default: 0 },
    winCount: { type: Number, default: 0 },
    lossCount: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 }
  },
  watchlist: [{ type: String }], // e.g. ['BTCUSDT','ETHUSDT']
  notifications: [
    {
      title: String,
      message: String,
      type: { type: String, enum: ['signal', 'trade', 'alert', 'system'] },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Get initials
userSchema.virtual('initials').get(function () {
  return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
});

module.exports = mongoose.model('User', userSchema);
