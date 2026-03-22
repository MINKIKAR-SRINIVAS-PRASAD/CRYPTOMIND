const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pair: { type: String, required: true, uppercase: true }, // e.g. 'BTC/USDT'
  symbol: { type: String, required: true, uppercase: true }, // e.g. 'BTCUSDT'
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number },
  takeProfitPrice: { type: Number },
  stopLossPrice: { type: Number },
  amount: { type: Number, required: true }, // USDT amount
  quantity: { type: Number }, // crypto quantity
  pnl: { type: Number, default: 0 },
  pnlPercent: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'CLOSED', 'TP_HIT', 'SL_HIT'], default: 'OPEN' },
  isAISignal: { type: Boolean, default: false },
  aiConfidence: { type: Number }, // 0-100
  signalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Signal' },
  notes: { type: String },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  duration: { type: Number }, // in minutes
});

// Calculate PnL
tradeSchema.methods.calculatePnL = function () {
  if (!this.exitPrice) return 0;
  if (this.side === 'BUY') {
    return ((this.exitPrice - this.entryPrice) / this.entryPrice) * this.amount;
  } else {
    return ((this.entryPrice - this.exitPrice) / this.entryPrice) * this.amount;
  }
};

// Virtual: formatted pair
tradeSchema.virtual('formattedPair').get(function () {
  return this.pair.replace('USDT', '/USDT');
});

module.exports = mongoose.model('Trade', tradeSchema);
