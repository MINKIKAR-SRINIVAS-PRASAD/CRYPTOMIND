const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Signal = require('../models/Signal');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @GET /api/signals — Get all signals
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 20, status } = req.query;
    const query = status ? { status } : {};
    const signals = await Signal.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json({ success: true, signals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/signals/latest — Get latest signal per symbol
router.get('/latest', protect, async (req, res) => {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
    const signals = await Promise.all(
      symbols.map(s => Signal.findOne({ symbol: s }).sort({ createdAt: -1 }))
    );
    res.json({ success: true, signals: signals.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/signals/generate — Generate new AI signal
router.post('/generate', protect, async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1h' } = req.body;
    const user = await User.findById(req.user._id);
    const riskProfile = user?.riskProfile || 'moderate';

    const signal = await aiService.generateSignal(symbol.toUpperCase(), interval, riskProfile);

    // Send email notification to user
    let emailSent = false;
    try {
      await emailService.sendTradeAlert(user.email, user.firstName, signal);
      emailSent = true;
    } catch (emailErr) {
      console.log('Email not configured for trade alert');
    }

    // Save notification
    const notification = await Notification.create({
      userId: req.user._id,
      title: `🤖 New AI Signal: ${signal.action} ${signal.pair}`,
      message: `Entry: $${signal.entryPrice?.toLocaleString()} | TP: $${signal.takeProfitPrice?.toLocaleString()} | SL: $${signal.stopLossPrice?.toLocaleString()} | Confidence: ${signal.confidence}%`,
      type: 'signal',
      data: { signalId: signal._id },
      emailSent
    });

    req.app.get('io')?.to(`user:${req.user._id}`).emit('notification', notification);
    req.app.get('io')?.broadcast?.emit('newSignal', signal);

    res.json({ success: true, signal, notification });
  } catch (err) {
    console.error('Generate signal error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/signals/chat — AI agent chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { query, signalId } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Query required.' });

    let currentSignal = null;
    if (signalId) {
      currentSignal = await Signal.findById(signalId);
    } else {
      currentSignal = await Signal.findOne({ symbol: 'BTCUSDT' }).sort({ createdAt: -1 });
    }

    const responses = await aiService.chatQuery(query, currentSignal);
    res.json({ success: true, responses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/signals/:id — Get signal by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) return res.status(404).json({ success: false, message: 'Signal not found.' });
    res.json({ success: true, signal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/signals/backtest — Run backtest
router.post('/backtest', protect, async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', strategy = 'rsi_ema', initialCapital = 10000 } = req.body;
    const result = await aiService.backtest(symbol, strategy, null, null, initialCapital);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
