const mongoose = require('mongoose');

const agentVoteSchema = new mongoose.Schema({
  agentName: { type: String }, // 'Conservative', 'Aggressive', 'Technical'
  vote: { type: String, enum: ['BUY', 'SELL', 'HOLD'] },
  confidence: { type: Number },
  reasoning: { type: String }
}, { _id: false });

const signalSchema = new mongoose.Schema({
  pair: { type: String, required: true }, // 'BTC/USDT'
  symbol: { type: String, required: true }, // 'BTCUSDT'
  action: { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
  entryPrice: { type: Number, required: true },
  takeProfitPrice: { type: Number },
  stopLossPrice: { type: Number },
  rrRatio: { type: Number }, // Risk:Reward ratio
  confidence: { type: Number }, // 0-100
  timeframe: { type: String, default: '1h' },
  agentVotes: [agentVoteSchema],
  judgeReasoning: { type: String },
  agentDiscussion: [
    {
      agentName: String,
      agentType: { type: String, enum: ['conservative', 'aggressive', 'technical', 'judge'] },
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  technicalIndicators: {
    rsi: Number,
    macd: Number,
    macdSignal: Number,
    macdHistogram: Number,
    ema20: Number,
    ema50: Number,
    sma200: Number,
    bollingerUpper: Number,
    bollingerMiddle: Number,
    bollingerLower: Number
  },
  status: { type: String, enum: ['ACTIVE', 'TP_HIT', 'SL_HIT', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  outcome: { type: String, enum: ['WIN', 'LOSS', 'PENDING'], default: 'PENDING' },
  actualExitPrice: { type: Number },
  actualPnlPercent: { type: Number },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Signal', signalSchema);
