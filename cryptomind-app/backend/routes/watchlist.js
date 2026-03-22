const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const binanceService = require('../services/binanceService');

// @GET /api/watchlist — Get user watchlist with prices
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('watchlist');
    const watchlist = user.watchlist || [];

    const enriched = await Promise.all(watchlist.map(async (symbol) => {
      const ticker = await binanceService.get24hrTicker(symbol).catch(() => null);
      const prices = binanceService.getAllPrices();
      const cached = prices[symbol];
      const klines = await binanceService.getKlines(symbol, '1h', 24).catch(() => []);
      const sparkline = klines.map(k => k.close);
      return {
        symbol,
        pair: symbol.replace('USDT', '/USDT'),
        name: symbolToName(symbol),
        icon: symbolToIcon(symbol),
        color: symbolToColor(symbol),
        price: parseFloat(ticker?.lastPrice || cached?.price || 0),
        priceChange: parseFloat(ticker?.priceChange || cached?.priceChange || 0),
        priceChangePercent: parseFloat(ticker?.priceChangePercent || cached?.priceChangePercent || 0),
        high24h: parseFloat(ticker?.highPrice || cached?.high || 0),
        low24h: parseFloat(ticker?.lowPrice || cached?.low || 0),
        volume: parseFloat(ticker?.volume || cached?.volume || 0),
        quoteVolume: parseFloat(ticker?.quoteVolume || cached?.quoteVolume || 0),
        sparkline
      };
    }));

    res.json({ success: true, watchlist: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/watchlist/add — Add to watchlist
router.post('/add', protect, async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required.' });

    const sym = symbol.toUpperCase();
    const user = await User.findById(req.user._id);

    if (user.watchlist.includes(sym)) {
      return res.status(400).json({ success: false, message: 'Already in watchlist.' });
    }
    if (user.watchlist.length >= 20) {
      return res.status(400).json({ success: false, message: 'Max 20 coins in watchlist.' });
    }

    user.watchlist.push(sym);
    await user.save({ validateModifiedOnly: true });

    res.json({ success: true, watchlist: user.watchlist, message: `${sym} added to watchlist.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/watchlist/:symbol — Remove from watchlist
router.delete('/:symbol', protect, async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const user = await User.findById(req.user._id);
    user.watchlist = user.watchlist.filter(s => s !== sym);
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, watchlist: user.watchlist, message: `${sym} removed.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: symbol to name
function symbolToName(symbol) {
  const names = {
    BTCUSDT: 'Bitcoin', ETHUSDT: 'Ethereum', SOLUSDT: 'Solana',
    BNBUSDT: 'Binance Coin', XRPUSDT: 'XRP', ADAUSDT: 'Cardano',
    DOGEUSDT: 'Dogecoin', AVAXUSDT: 'Avalanche', MATICUSDT: 'Polygon',
    DOTUSDT: 'Polkadot', LINKUSDT: 'Chainlink', LTCUSDT: 'Litecoin'
  };
  return names[symbol] || symbol.replace('USDT', '');
}

function symbolToIcon(symbol) {
  const icons = {
    BTCUSDT: '₿', ETHUSDT: 'Ξ', SOLUSDT: '◎', BNBUSDT: '◈',
    XRPUSDT: '✕', ADAUSDT: '₳', DOGEUSDT: 'Ð', AVAXUSDT: '▲'
  };
  return icons[symbol] || symbol[0];
}

function symbolToColor(symbol) {
  const colors = {
    BTCUSDT: 'rgba(247,147,26,0.15)', ETHUSDT: 'rgba(98,126,234,0.15)',
    SOLUSDT: 'rgba(0,172,193,0.15)', BNBUSDT: 'rgba(245,158,11,0.15)',
    XRPUSDT: 'rgba(226,73,26,0.15)', ADAUSDT: 'rgba(0,82,172,0.15)',
    DOGEUSDT: 'rgba(194,158,34,0.15)', AVAXUSDT: 'rgba(232,65,66,0.15)'
  };
  return colors[symbol] || 'rgba(59,130,246,0.15)';
}

module.exports = router;
