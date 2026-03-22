const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const Notification = require('../models/Notification');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, riskProfile } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });
    }

    const user = await User.create({
      firstName, lastName,
      email: email.toLowerCase(),
      password, phone,
      riskProfile: riskProfile || 'moderate',
      watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcome(user.email, user.firstName).catch(console.error);

    // Add welcome notification
    await Notification.create({
      userId: user._id,
      title: 'Welcome to CryptoMind! 🎉',
      message: 'Your account is ready. Start exploring AI-powered trade signals.',
      type: 'system'
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        riskProfile: user.riskProfile,
        portfolio: user.portfolio,
        watchlist: user.watchlist
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
  }
});

// @POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateModifiedOnly: true });

    // Try to send email, but also return success for demo purposes
    let emailSent = false;
    try {
      await emailService.sendOTP(user.email, otp, user.firstName);
      emailSent = true;
    } catch (emailErr) {
      console.log('Email not configured, OTP:', otp);
    }

    res.json({
      success: true,
      message: emailSent ? `OTP sent to ${email}` : 'OTP generated (email not configured). Check server logs.',
      // In development, return OTP if email not configured
      ...(process.env.NODE_ENV !== 'production' && !emailSent && { devOtp: otp })
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// @POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    user.isEmailVerified = true;
    await user.save({ validateModifiedOnly: true });

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        riskProfile: user.riskProfile,
        portfolio: user.portfolio,
        watchlist: user.watchlist,
        initials: `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
});

// @POST /api/auth/login (password login, then sends OTP)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate and send OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateModifiedOnly: true });

    let emailSent = false;
    try {
      await emailService.sendOTP(user.email, otp, user.firstName);
      emailSent = true;
    } catch (emailErr) {
      console.log(`Email not configured. OTP for ${email}: ${otp}`);
    }

    res.json({
      success: true,
      message: emailSent ? 'OTP sent to your email.' : 'OTP generated.',
      step: 'otp',
      ...(process.env.NODE_ENV !== 'production' && !emailSent && { devOtp: otp })
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// @GET /api/auth/me
const { protect } = require('../middleware/auth');
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -otp');
  res.json({ success: true, user });
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, riskProfile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone, riskProfile },
      { new: true, runValidators: true }
    ).select('-password -otp');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
