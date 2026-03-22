const WebSocket = require('ws');
const { EventEmitter } = require('events');

class BinanceService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.subscriptions = new Set();
    this.prices = {};
    this.klineData = {};
    this.reconnectTimer = null;
    this.isConnected = false;

    // Default symbols to track
    this.defaultSymbols = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt', 'dogeusdt', 'avaxusdt'];
  }

  connect() {
    const streams = this.defaultSymbols.map(s => `${s}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    console.log('🔌 Connecting to Binance WebSocket...');
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('✅ Binance WebSocket connected');
      this.isConnected = true;
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.data) {
          const ticker = parsed.data;
          const symbol = ticker.s; // e.g. BTCUSDT
          this.prices[symbol] = {
            symbol,
            price: parseFloat(ticker.c),
            priceChange: parseFloat(ticker.p),
            priceChangePercent: parseFloat(ticker.P),
            high: parseFloat(ticker.h),
            low: parseFloat(ticker.l),
            volume: parseFloat(ticker.v),
            quoteVolume: parseFloat(ticker.q),
            openPrice: parseFloat(ticker.o),
            prevClose: parseFloat(ticker.x),
            trades: ticker.n,
            timestamp: Date.now()
          };
          this.emit('tickerUpdate', this.prices[symbol]);
          this.emit(`ticker:${symbol}`, this.prices[symbol]);
        }
      } catch (err) {
        // ignore parse errors
      }
    });

    this.ws.on('close', () => {
      console.log('🔴 Binance WebSocket disconnected. Reconnecting in 5s...');
      this.isConnected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('❌ Binance WS error:', err.message);
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }

  // Fetch historical klines from REST API
  async getKlines(symbol, interval = '1h', limit = 100) {
    const axios = require('axios');
    try {
      const res = await axios.get(`https://api.binance.com/api/v3/klines`, {
        params: { symbol: symbol.toUpperCase(), interval, limit },
        timeout: 10000
      });
      return res.data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
    } catch (err) {
      console.error('Klines fetch error:', err.message);
      // Return mock data if API fails
      return this._generateMockKlines(symbol, limit);
    }
  }

  // Fetch 24hr ticker
  async get24hrTicker(symbol) {
    const axios = require('axios');
    try {
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr`, {
        params: { symbol: symbol.toUpperCase() },
        timeout: 5000
      });
      return res.data;
    } catch (err) {
      return this.prices[symbol.toUpperCase()] || null;
    }
  }

  // Fetch all tickers
  async getAllTickers() {
    const axios = require('axios');
    try {
      const symbols = this.defaultSymbols.map(s => s.toUpperCase());
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr`, { timeout: 8000 });
      return res.data.filter(t => symbols.includes(t.symbol)).map(t => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        priceChangePercent: parseFloat(t.priceChangePercent),
        priceChange: parseFloat(t.priceChange),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume)
      }));
    } catch (err) {
      // Return cached prices
      return Object.values(this.prices);
    }
  }

  getCurrentPrice(symbol) {
    return this.prices[symbol.toUpperCase()]?.price || null;
  }

  getAllPrices() {
    return this.prices;
  }

  _generateMockKlines(symbol, limit) {
    const basePrices = {
      BTCUSDT: 67000, ETHUSDT: 3500, SOLUSDT: 180,
      BNBUSDT: 410, XRPUSDT: 0.58
    };
    const base = basePrices[symbol.toUpperCase()] || 100;
    const klines = [];
    let price = base;
    const now = Date.now();
    for (let i = limit; i >= 0; i--) {
      const change = (Math.random() - 0.48) * (base * 0.02);
      price = Math.max(price + change, base * 0.5);
      const open = price;
      const close = price + (Math.random() - 0.5) * (base * 0.01);
      const high = Math.max(open, close) + Math.random() * (base * 0.005);
      const low = Math.min(open, close) - Math.random() * (base * 0.005);
      klines.push({
        time: Math.floor((now - i * 3600000) / 1000),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat((Math.random() * 1000 + 100).toFixed(2))
      });
    }
    return klines;
  }
}

module.exports = new BinanceService();
