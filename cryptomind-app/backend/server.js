require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const binanceService = require('./services/binanceService');
const emailService = require('./services/emailService');

const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/market', require('./routes/market'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    binance: binanceService.isConnected,
    timestamp: new Date().toISOString()
  });
});

// ─── SOCKET.IO EVENTS ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join user room
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined room`);
    }
  });

  // Subscribe to specific symbol updates
  socket.on('subscribeTicker', (symbol) => {
    socket.join(`ticker:${symbol.toUpperCase()}`);
  });

  socket.on('unsubscribeTicker', (symbol) => {
    socket.leave(`ticker:${symbol.toUpperCase()}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Broadcast Binance price updates to subscribed clients
binanceService.on('tickerUpdate', (ticker) => {
  io.to(`ticker:${ticker.symbol}`).emit('tickerUpdate', ticker);
  io.emit('priceUpdate', ticker); // broadcast to all
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── STARTUP ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  console.log("✅ MongoDB connected");
  binanceService.connect();
  // await emailService.verify();   // temporarily disabled

  server.listen(PORT, () => {
  console.log(`
  🚀 ─────────────────────────────────────────────
  CryptoMind Backend running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
 MongoDB: Connected
                      Binance WS: Starting...
                         API: http://localhost:${PORT}/api
                         ─────────────────────────────────────────────
                             `);
});
};


start().catch(console.error);

module.exports = { app, server };
