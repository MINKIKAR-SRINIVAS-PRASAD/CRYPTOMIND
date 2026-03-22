const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const binanceService = require('../services/binanceService');

// @GET /api/trades — Get user trades
router.get('/', protect, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const trades = await Trade.find(query)
      .sort({ openedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Trade.countDocuments(query);

    res.json({ success: true, trades, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/trades — Place a dummy trade
router.post('/', protect, async (req, res) => {
  try {
    const { pair, side, entryPrice, amount, takeProfitPrice, stopLossPrice, isAISignal, signalId } = req.body;

    if (!pair || !side || !entryPrice || !amount) {
      return res.status(400).json({ success: false, message: 'Pair, side, entry price and amount are required.' });
    }

    const symbol = pair.replace('/', '');
    const currentPrice = binanceService.getCurrentPrice(symbol) || parseFloat(entryPrice);
    const quantity = parseFloat(amount) / parseFloat(entryPrice);

    const trade = await Trade.create({
      userId: req.user._id,
      pair: pair.includes('/') ? pair : pair.replace('USDT', '/USDT'),
      symbol,
      side,
      entryPrice: parseFloat(entryPrice),
      takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : null,
      stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : null,
      amount: parseFloat(amount),
      quantity: parseFloat(quantity.toFixed(6)),
      isAISignal: !!isAISignal,
      signalId: signalId || null,
      status: 'OPEN'
    });

    // Update user portfolio
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'portfolio.totalTrades': 1 }
    });

    // Create notification
    const notification = await Notification.create({
      userId: req.user._id,
      title: `Trade Opened: ${pair} ${side}`,
      message: `${side} ${pair} at $${parseFloat(entryPrice).toLocaleString()}. Amount: $${parseFloat(amount).toLocaleString()}`,
      type: 'trade',
      data: { tradeId: trade._id, pair, side, entryPrice }
    });

    // Emit to user's socket room
    req.app.get('io')?.to(`user:${req.user._id}`).emit('notification', notification);

    res.status(201).json({ success: true, trade, notification });
  } catch (err) {
    console.error('Place trade error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/trades/:id/close — Close a trade
router.put('/:id/close', protect, async (req, res) => {
  try {
    const { exitPrice } = req.body;
    const trade = await Trade.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found.' });
    if (trade.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Trade already closed.' });

    const exit = exitPrice
      ? parseFloat(exitPrice)
      : (binanceService.getCurrentPrice(trade.symbol) || trade.entryPrice * (1 + (Math.random() - 0.4) * 0.05));

    // Calculate PnL
    let pnl;
    if (trade.side === 'BUY') {
      pnl = ((exit - trade.entryPrice) / trade.entryPrice) * trade.amount;
    } else {
      pnl = ((trade.entryPrice - exit) / trade.entryPrice) * trade.amount;
    }
    const pnlPercent = (pnl / trade.amount) * 100;

    trade.exitPrice = exit;
    trade.pnl = parseFloat(pnl.toFixed(2));
    trade.pnlPercent = parseFloat(pnlPercent.toFixed(2));
    trade.status = 'CLOSED';
    trade.closedAt = new Date();
    trade.duration = Math.floor((trade.closedAt - trade.openedAt) / 60000);
    await trade.save();

    // Update user portfolio
    const isWin = pnl >= 0;
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'portfolio.totalPnl': trade.pnl,
        'portfolio.winCount': isWin ? 1 : 0,
        'portfolio.lossCount': isWin ? 0 : 1
      }
    });

    // Notification
    const notif = await Notification.create({
      userId: req.user._id,
      title: `Trade Closed: ${trade.pair} ${isWin ? '🟢 WIN' : '🔴 LOSS'}`,
      message: `${trade.side} ${trade.pair} closed at $${exit.toLocaleString()}. P&L: ${pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`,
      type: 'trade',
      data: { tradeId: trade._id, pnl: trade.pnl }
    });

    req.app.get('io')?.to(`user:${req.user._id}`).emit('notification', notif);
    req.app.get('io')?.to(`user:${req.user._id}`).emit('tradeUpdated', trade);

    res.json({ success: true, trade, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/trades/stats — Get trading statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.user._id });
    const closed = trades.filter(t => t.status === 'CLOSED');
    const open = trades.filter(t => t.status === 'OPEN');

    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = closed.filter(t => (t.pnl || 0) >= 0).length;
    const losses = closed.filter(t => (t.pnl || 0) < 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

    const pnls = closed.map(t => t.pnl || 0);
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;
    const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;

    const profitFactor = losses > 0
      ? Math.abs(pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) /
        pnls.filter(p => p < 0).reduce((a, b) => a + b, 0))
      : pnls.filter(p => p > 0).length > 0 ? 999 : 0;

    // Daily PnL for chart
    const dailyPnl = {};
    closed.forEach(t => {
      const day = t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
      if (day) dailyPnl[day] = (dailyPnl[day] || 0) + (t.pnl || 0);
    });

    const user = await User.findById(req.user._id).select('portfolio');

    res.json({
      success: true,
      stats: {
        totalTrades: trades.length,
        openTrades: open.length,
        closedTrades: closed.length,
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(2)),
        wins, losses,
        bestTrade: parseFloat(bestTrade.toFixed(2)),
        worstTrade: parseFloat(worstTrade.toFixed(2)),
        avgPnl: parseFloat(avgPnl.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        balance: user?.portfolio?.balance || 100000,
        dailyPnlChart: Object.entries(dailyPnl).slice(-30).map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
