const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const binanceService = require('../services/binanceService');

// @GET /api/market/prices — Get all live prices
router.get('/prices', async (req, res) => {
  try {
    const prices = binanceService.getAllPrices();
    res.json({ success: true, prices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/market/tickers — Get 24hr tickers
router.get('/tickers', async (req, res) => {
  try {
    const tickers = await binanceService.getAllTickers();
    res.json({ success: true, tickers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/market/klines/:symbol — Candlestick data
router.get('/klines/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    const klines = await binanceService.getKlines(symbol.toUpperCase(), interval, parseInt(limit));
    res.json({ success: true, klines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/market/ticker/:symbol — Single ticker
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const ticker = await binanceService.get24hrTicker(req.params.symbol.toUpperCase());
    res.json({ success: true, ticker });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
