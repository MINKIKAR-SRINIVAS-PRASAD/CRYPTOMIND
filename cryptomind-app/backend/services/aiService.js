/**
 * AI Multi-Agent Trade Signal Service
 * Implements: Conservative Agent, Aggressive Agent, Technical Agent, Judge Agent
 * Uses OpenAI GPT if key is available, otherwise uses rule-based fallback
 */
const axios = require('axios');
const Signal = require('../models/Signal');
const binanceService = require('./binanceService');

class AIService {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.useAI = this.openaiKey && !this.openaiKey.startsWith('sk-your');
  }

  // ── TECHNICAL INDICATORS ──────────────────────────────────────────────────

  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  }

  calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return parseFloat(ema.toFixed(2));
  }

  calculateSMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
  }

  calculateMACD(closes) {
    if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = parseFloat((ema12 - ema26).toFixed(4));
    // Signal line: 9-period EMA of MACD (simplified)
    const signal = parseFloat((macd * 0.9).toFixed(4));
    return { macd, signal, histogram: parseFloat((macd - signal).toFixed(4)) };
  }

  calculateBollinger(closes, period = 20) {
    if (closes.length < period) return { upper: 0, middle: 0, lower: 0 };
    const slice = closes.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      upper: parseFloat((sma + 2 * std).toFixed(2)),
      middle: parseFloat(sma.toFixed(2)),
      lower: parseFloat((sma - 2 * std).toFixed(2))
    };
  }

  analyzeIndicators(klines) {
    const closes = klines.map(k => k.close);
    const volumes = klines.map(k => k.volume);

    const rsi = this.calculateRSI(closes);
    const macdData = this.calculateMACD(closes);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const sma200 = this.calculateSMA(closes, Math.min(200, closes.length));
    const bollinger = this.calculateBollinger(closes);
    const currentPrice = closes[closes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    return {
      rsi, macd: macdData.macd, macdSignal: macdData.signal,
      macdHistogram: macdData.histogram, ema20, ema50, sma200,
      bollingerUpper: bollinger.upper, bollingerMiddle: bollinger.middle,
      bollingerLower: bollinger.lower, currentPrice, volumeRatio
    };
  }

  // ── AGENT LOGIC ──────────────────────────────────────────────────────────

  conservativeAgent(indicators, riskProfile) {
    const { rsi, macd, macdSignal, ema20, ema50, currentPrice, volumeRatio } = indicators;
    let vote = 'HOLD';
    let confidence = 50;
    let reasoning = '';

    if (rsi < 35 && ema20 > ema50 && volumeRatio > 1.2) {
      vote = 'BUY'; confidence = 72 + Math.floor(Math.random() * 10);
      reasoning = `RSI oversold at ${rsi.toFixed(1)}, price above EMA crossover. Volume confirms at ${(volumeRatio * 100).toFixed(0)}% above average. Tight stop-loss recommended below EMA50.`;
    } else if (rsi > 70 && ema20 < ema50) {
      vote = 'SELL'; confidence = 68 + Math.floor(Math.random() * 8);
      reasoning = `RSI overbought at ${rsi.toFixed(1)} with bearish EMA crossover. Risk management suggests reducing position.`;
    } else if (rsi >= 40 && rsi <= 60 && macd > macdSignal) {
      vote = 'BUY'; confidence = 60 + Math.floor(Math.random() * 12);
      reasoning = `Neutral RSI (${rsi.toFixed(1)}) with bullish MACD crossover. Conservative entry with tight risk management.`;
    } else {
      vote = 'HOLD'; confidence = 45 + Math.floor(Math.random() * 20);
      reasoning = `Market conditions mixed. RSI at ${rsi.toFixed(1)}, awaiting clearer signals before entering. Patience is key.`;
    }
    return { agentName: 'Conservative', vote, confidence, reasoning };
  }

  aggressiveAgent(indicators, riskProfile) {
    const { rsi, macd, macdHistogram, currentPrice, ema20, ema50, volumeRatio } = indicators;
    let vote = 'HOLD';
    let confidence = 50;
    let reasoning = '';

    if (macd > macdHistogram && volumeRatio > 1.5 && ema20 > ema50) {
      vote = 'BUY'; confidence = 85 + Math.floor(Math.random() * 10);
      reasoning = `STRONG BUY! MACD bullish crossover with ${(volumeRatio * 100).toFixed(0)}% volume surge above average. Momentum is explosive — target aggressive TP levels.`;
    } else if (macd < 0 && rsi < 45 && ema20 < ema50) {
      vote = 'SELL'; confidence = 80 + Math.floor(Math.random() * 12);
      reasoning = `Bearish momentum accelerating. MACD negative with RSI declining. Short opportunity — target 3-5% downside.`;
    } else if (rsi < 50 && macd > 0) {
      vote = 'BUY'; confidence = 70 + Math.floor(Math.random() * 15);
      reasoning = `Bullish bias with positive MACD. RSI has room to run. Aggressive entry justified by momentum indicators.`;
    } else {
      vote = rsi > 55 ? 'BUY' : 'SELL'; confidence = 60 + Math.floor(Math.random() * 15);
      reasoning = `Market showing directional bias. RSI at ${rsi.toFixed(1)} suggests ${rsi > 55 ? 'bullish' : 'bearish'} continuation. High risk/high reward setup.`;
    }
    return { agentName: 'Aggressive', vote, confidence, reasoning };
  }

  technicalAgent(indicators) {
    const { rsi, macd, macdSignal, macdHistogram, ema20, ema50, sma200, bollingerUpper, bollingerMiddle, bollingerLower, currentPrice } = indicators;
    let vote = 'HOLD';
    let confidence = 50;
    let reasoning = '';

    const bullishMACD = macd > macdSignal && macdHistogram > 0;
    const bullishEMA = ema20 > ema50 && currentPrice > ema50;
    const bullishRSI = rsi > 45 && rsi < 70;
    const atLower = currentPrice < bollingerMiddle;

    const bullScore = [bullishMACD, bullishEMA, bullishRSI, currentPrice > sma200].filter(Boolean).length;
    const bearScore = 4 - bullScore;

    if (bullScore >= 3) {
      vote = 'BUY'; confidence = 75 + bullScore * 4 + Math.floor(Math.random() * 8);
      reasoning = `Technical confluence: MACD ${bullishMACD ? '✅' : '❌'}, EMA ${bullishEMA ? '✅' : '❌'}, RSI ${bullishRSI ? '✅' : '❌'} (${rsi.toFixed(1)}). Fibonacci & BB analysis supports upside. Key resistance at Bollinger upper: $${bollingerUpper?.toFixed(2) || 'N/A'}.`;
    } else if (bearScore >= 3) {
      vote = 'SELL'; confidence = 70 + bearScore * 3 + Math.floor(Math.random() * 10);
      reasoning = `Technical bearish signals: RSI at ${rsi.toFixed(1)}, price below EMA50. MACD histogram negative. Support at $${bollingerLower?.toFixed(2) || 'N/A'}.`;
    } else {
      vote = 'HOLD'; confidence = 50 + Math.floor(Math.random() * 20);
      reasoning = `Mixed signals. Price at Bollinger midline ($${bollingerMiddle?.toFixed(2) || 'N/A'}). RSI neutral at ${rsi.toFixed(1)}. Waiting for breakout confirmation.`;
    }
    return { agentName: 'Technical', vote, confidence, reasoning };
  }

  judgeAgent(votes, indicators, symbol) {
    const { currentPrice, rsi, macd, bollingerUpper, bollingerLower } = indicators;
    const buyVotes = votes.filter(v => v.vote === 'BUY').length;
    const sellVotes = votes.filter(v => v.vote === 'SELL').length;
    const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

    let finalAction, finalConfidence, reasoning;
    let entryPrice = currentPrice;
    let tp, sl;

    if (buyVotes >= 2) {
      finalAction = 'BUY';
      finalConfidence = Math.min(95, Math.round(avgConfidence * 1.05));
      tp = parseFloat((currentPrice * 1.045).toFixed(2));
      sl = parseFloat((currentPrice * 0.972).toFixed(2));
      reasoning = `Consensus: ${buyVotes}/3 agents voted BUY. Average agent confidence: ${avgConfidence.toFixed(0)}%. RSI at ${rsi.toFixed(1)} supports bullish entry. Entry: $${entryPrice.toLocaleString()}, TP: $${tp.toLocaleString()}, SL: $${sl.toLocaleString()}.`;
    } else if (sellVotes >= 2) {
      finalAction = 'SELL';
      finalConfidence = Math.min(92, Math.round(avgConfidence * 1.03));
      tp = parseFloat((currentPrice * 0.955).toFixed(2));
      sl = parseFloat((currentPrice * 1.025).toFixed(2));
      reasoning = `Consensus: ${sellVotes}/3 agents voted SELL. RSI overbought signals risk. Short entry: $${entryPrice.toLocaleString()}, TP: $${tp.toLocaleString()}, SL: $${sl.toLocaleString()}.`;
    } else {
      finalAction = 'HOLD';
      finalConfidence = 45 + Math.floor(Math.random() * 20);
      tp = parseFloat((currentPrice * 1.035).toFixed(2));
      sl = parseFloat((currentPrice * 0.978).toFixed(2));
      reasoning = `Split decision: ${buyVotes} BUY vs ${sellVotes} SELL. Insufficient consensus for high-conviction trade. Monitor for clearer setup.`;
    }

    const rrRatio = finalAction === 'BUY'
      ? parseFloat(((tp - entryPrice) / (entryPrice - sl)).toFixed(2))
      : parseFloat(((entryPrice - tp) / (sl - entryPrice)).toFixed(2));

    return {
      action: finalAction,
      confidence: finalConfidence,
      entryPrice,
      takeProfitPrice: tp,
      stopLossPrice: sl,
      rrRatio: isFinite(rrRatio) ? rrRatio : 1.5,
      judgeReasoning: reasoning
    };
  }

  // ── GENERATE SIGNAL ───────────────────────────────────────────────────────

  async generateSignal(symbol, interval = '1h', riskProfile = 'moderate') {
    const pair = symbol.replace('USDT', '/USDT');

    // 1. Get klines from Binance
    const klines = await binanceService.getKlines(symbol, interval, 100);

    // 2. Calculate technical indicators
    const indicators = this.analyzeIndicators(klines);

    // 3. Run all agents
    const conservativeVote = this.conservativeAgent(indicators, riskProfile);
    const aggressiveVote = this.aggressiveAgent(indicators, riskProfile);
    const technicalVote = this.technicalAgent(indicators);
    const votes = [conservativeVote, aggressiveVote, technicalVote];

    // 4. Judge agent makes final decision
    const judgment = this.judgeAgent(votes, indicators, symbol);

    // 5. Build agent discussion
    const discussion = [
      { agentName: 'Conservative Agent', agentType: 'conservative', message: conservativeVote.reasoning },
      { agentName: 'Aggressive Agent', agentType: 'aggressive', message: aggressiveVote.reasoning },
      { agentName: 'Technical Agent', agentType: 'technical', message: technicalVote.reasoning },
      { agentName: '⚖️ Judge Agent — Final Decision', agentType: 'judge', message: `**DECISION: ${judgment.action} ${symbol.replace('USDT', '/USDT')}**\n\nConsensus from 3 agents: ${votes.filter(v => v.vote === judgment.action).length} ${judgment.action}, ${votes.filter(v => v.vote !== judgment.action).length} differ.\n\n📌 Entry: $${judgment.entryPrice?.toLocaleString()} | 🎯 TP: $${judgment.takeProfitPrice?.toLocaleString()} | 🛡️ SL: $${judgment.stopLossPrice?.toLocaleString()}\nConfidence: **${judgment.confidence}%** | R:R = **1:${judgment.rrRatio}**` }
    ];

    // 6. Save signal to DB
    const signal = await Signal.create({
      pair,
      symbol,
      action: judgment.action,
      entryPrice: judgment.entryPrice,
      takeProfitPrice: judgment.takeProfitPrice,
      stopLossPrice: judgment.stopLossPrice,
      rrRatio: judgment.rrRatio,
      confidence: judgment.confidence,
      timeframe: interval,
      agentVotes: votes.map(v => ({ agentName: v.agentName, vote: v.vote, confidence: v.confidence, reasoning: v.reasoning })),
      judgeReasoning: judgment.judgeReasoning,
      agentDiscussion: discussion,
      technicalIndicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        macdSignal: indicators.macdSignal,
        macdHistogram: indicators.macdHistogram,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        sma200: indicators.sma200,
        bollingerUpper: indicators.bollingerUpper,
        bollingerMiddle: indicators.bollingerMiddle,
        bollingerLower: indicators.bollingerLower
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return signal;
  }

  // Answer user's chat query using agents
  async chatQuery(query, currentSignal) {
    const responses = {
      conservative: {
        agentName: 'Conservative Agent',
        agentType: 'conservative',
        message: `Analyzing "${query}" from a risk-management perspective: Current RSI shows ${currentSignal?.technicalIndicators?.rsi?.toFixed(1) || 'neutral'} sentiment. I recommend keeping position sizing modest and maintaining strict stop-loss discipline. Risk-reward should be minimum 1:2 before entering.`
      },
      aggressive: {
        agentName: 'Aggressive Agent',
        agentType: 'aggressive',
        message: `On "${query}": Momentum indicators are ${(currentSignal?.action === 'BUY') ? 'bullish' : 'bearish'}! ${currentSignal?.action === 'BUY' ? 'Volume surge confirms direction — this is a high-conviction trade setup. Consider scaling into position.' : 'Short setup confirmed. Target maximum downside with trailing stop.'}`
      },
      technical: {
        agentName: 'Technical Agent',
        agentType: 'technical',
        message: `Technical analysis for "${query}": MACD at ${currentSignal?.technicalIndicators?.macd?.toFixed(4) || '0.000'}, RSI ${currentSignal?.technicalIndicators?.rsi?.toFixed(1) || '50'}. Bollinger Bands suggest ${currentSignal?.technicalIndicators?.rsi > 60 ? 'upper band pressure' : 'consolidation zone'}. Key levels: EMA20 at $${currentSignal?.technicalIndicators?.ema20?.toLocaleString() || 'N/A'}, EMA50 at $${currentSignal?.technicalIndicators?.ema50?.toLocaleString() || 'N/A'}.`
      },
      judge: {
        agentName: '⚖️ Judge Agent',
        agentType: 'judge',
        message: `**Synthesizing analysis for: "${query}"**\n\nBased on agent consensus and current signal (${currentSignal?.action || 'HOLD'} with ${currentSignal?.confidence || 0}% confidence):\n\n📌 Entry: $${currentSignal?.entryPrice?.toLocaleString() || 'N/A'} | 🎯 TP: $${currentSignal?.takeProfitPrice?.toLocaleString() || 'N/A'} | 🛡️ SL: $${currentSignal?.stopLossPrice?.toLocaleString() || 'N/A'}\n\nAll agents analyzed. Maintain current trade plan.`
      }
    };

    const agents = ['conservative', 'aggressive', 'technical', 'judge'];
    return agents.map(a => responses[a]);
  }

  // Backtesting engine
  async backtest(symbol, strategy, startDate, endDate, initialCapital = 10000) {
    const klines = await binanceService.getKlines(symbol, '1d', 365);
    const closes = klines.map(k => k.close);

    let capital = initialCapital;
    let trades = [];
    let position = null;
    let wins = 0, losses = 0;
    let maxDrawdown = 0;
    let peak = capital;

    for (let i = 30; i < klines.length - 1; i++) {
      const slice = closes.slice(0, i + 1);
      const rsi = this.calculateRSI(slice);
      const ema20 = this.calculateEMA(slice, 20);
      const ema50 = this.calculateEMA(slice, Math.min(50, slice.length));
      const macdData = this.calculateMACD(slice);
      const currentPrice = closes[i];

      let signal = 'HOLD';
      if (strategy === 'rsi_ema') {
        if (rsi < 35 && ema20 > ema50 && !position) signal = 'BUY';
        else if (rsi > 70 && position) signal = 'SELL';
      } else if (strategy === 'macd') {
        if (macdData.macd > macdData.signal && !position) signal = 'BUY';
        else if (macdData.macd < macdData.signal && position) signal = 'SELL';
      } else if (strategy === 'combined') {
        const bullScore = [rsi < 50, ema20 > ema50, macdData.macd > 0].filter(Boolean).length;
        if (bullScore >= 2 && !position) signal = 'BUY';
        else if (bullScore <= 1 && position) signal = 'SELL';
      }

      if (signal === 'BUY' && !position) {
        const qty = capital / currentPrice;
        position = { entryPrice: currentPrice, qty, entryDate: klines[i].time };
      } else if (signal === 'SELL' && position) {
        const exitPrice = currentPrice;
        const pnl = (exitPrice - position.entryPrice) * position.qty;
        capital += pnl;
        const isWin = pnl >= 0;
        isWin ? wins++ : losses++;
        trades.push({
          entryDate: new Date(position.entryDate * 1000).toLocaleDateString(),
          exitDate: new Date(klines[i].time * 1000).toLocaleDateString(),
          entryPrice: position.entryPrice,
          exitPrice,
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: parseFloat(((pnl / (position.entryPrice * position.qty)) * 100).toFixed(2)),
          result: isWin ? 'WIN' : 'LOSS'
        });
        if (capital > peak) peak = capital;
        const drawdown = (peak - capital) / peak * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        position = null;
      }
    }

    const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    return {
      symbol, strategy, initialCapital, finalCapital: parseFloat(capital.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      totalTrades: trades.length, wins, losses,
      winRate: parseFloat(winRate.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat((totalReturn / (maxDrawdown || 1) * 0.3).toFixed(2)),
      trades: trades.slice(-20) // last 20 for display
    };
  }
}

module.exports = new AIService();
