# 🚀 CryptoMind — AI Trading Platform

> A full-stack Web2 platform combining live Binance data, AI multi-agent trade signals, interactive charting, backtesting, and email notifications.

![CryptoMind](https://img.shields.io/badge/CryptoMind-AI%20Trading-3b82f6?style=for-the-badge)

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, React Router v6, Recharts, Lightweight Charts, Socket.io-client, Framer Motion |
| **Backend** | Node.js, Express.js, Socket.io, WebSocket (Binance) |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT + OTP (email-based) |
| **Email** | Nodemailer (Gmail SMTP) |
| **AI Agents** | Custom rule-based + OpenAI GPT (optional) |
| **Charts** | TradingView Lightweight Charts, Recharts |

---

## 📋 Features Implemented

### ✅ Mandatory Features
- [x] **OTP-based Authentication** — Email OTP login/signup with JWT
- [x] **Real-time Binance Integration** — WebSocket streams for live prices
- [x] **Interactive Charts** — Candlestick, Line, Area charts via TradingView Lightweight Charts
- [x] **Crypto Dashboard** — 8+ coins with live metrics
- [x] **Watchlist** — Add/remove coins, mini sparkline charts
- [x] **Dummy Trades** — Place/close trades with live P&L calculation
- [x] **AI Signal Generation** — Multi-agent system (Conservative + Aggressive + Technical + Judge)
- [x] **Trade Display Interface** — Full trade history with filters
- [x] **Email Notifications** — Trade alerts, OTP, welcome emails via Nodemailer
- [x] **Notification Dropdown** — Real-time bell notifications via Socket.io

### ✅ Bonus Features
- [x] **Backtesting Engine** — Test RSI+EMA, MACD, Combined strategies
- [x] **Technical Indicators** — RSI, MACD, EMA20/50, SMA200, Bollinger Bands
- [x] **User Risk Profiling** — Conservative / Moderate / Aggressive
- [x] **Performance Analytics** — Cumulative P&L, Win/Loss ratio, Weekly volume
- [x] **Multi-Agent Chat** — Interactive chat with AI agents
- [x] **Real-time Price Updates** — Socket.io live price broadcasting

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Git

### 1. Clone & Setup

```bash
cd cryptomind-app
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 4. Configure Environment Variables

**Backend `.env`:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cryptomind
CLIENT_URL=http://localhost:3000
```

**Frontend `.env`:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 📁 Project Structure

```
cryptomind-app/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User model (OOP)
│   │   ├── Trade.js             # Trade model
│   │   ├── Signal.js            # AI Signal model
│   │   └── Notification.js     # Notification model
│   ├── routes/
│   │   ├── auth.js              # Auth routes (register, login, OTP)
│   │   ├── trades.js            # Trade CRUD + stats
│   │   ├── signals.js           # AI signal generation
│   │   ├── watchlist.js         # Watchlist management
│   │   ├── notifications.js     # Notification management
│   │   └── market.js            # Binance market data
│   ├── services/
│   │   ├── binanceService.js    # Binance WebSocket + REST
│   │   ├── aiService.js         # Multi-agent AI system
│   │   └── emailService.js      # Nodemailer email service
│   ├── middleware/
│   │   └── auth.js              # JWT middleware
│   ├── server.js                # Express + Socket.io server
│   └── .env.example
│
└── frontend/
    └── src/
        ├── context/
        │   ├── AuthContext.js   # Authentication state
        │   └── SocketContext.js # Real-time WebSocket state
        ├── pages/
        │   ├── Auth.jsx         # Login + OTP page
        │   ├── Dashboard.jsx    # Main dashboard
        │   ├── AISignals.jsx    # Multi-agent signals
        │   ├── Watchlist.jsx    # Coin watchlist
        │   ├── Trades.jsx       # Dummy trades
        │   ├── Analytics.jsx    # Performance analytics
        │   ├── Backtest.jsx     # Backtesting engine
        │   └── Settings.jsx     # User settings
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx  # Navigation sidebar
        │   │   └── Topbar.jsx   # Top bar + notifications
        │   ├── charts/
        │   │   └── CandlestickChart.jsx  # TradingView chart
        │   └── ui/
        │       └── TradeModal.jsx # Quick trade modal
        ├── services/
        │   └── api.js           # Axios API client
        └── utils/
            └── helpers.js       # Formatters & constants
```

---

## 🤖 AI Multi-Agent System

The platform uses a **4-agent debate system**:

| Agent | Strategy | Focus |
|-------|---------|-------|
| 🛡️ Conservative | RSI + tight stops | Risk management |
| 🚀 Aggressive | Momentum + MACD | Maximum upside |
| 📊 Technical | Multi-indicator scoring | TA confluence |
| ⚖️ Judge | Consensus arbitration | Final decision |

Each agent votes BUY/SELL/HOLD with a confidence score. The Judge aggregates all votes and outputs Entry, Take Profit, Stop Loss, and Risk:Reward ratio.

---

## 📊 Backtesting Strategies

| Strategy | Description |
|---------|-------------|
| RSI + EMA | Buy RSI < 35 & EMA20 > EMA50. Sell RSI > 70 |
| MACD Crossover | Buy on bullish MACD cross, sell on bearish |
| Combined | Score-based: RSI + EMA + MACD weighted |

---

## 🔒 Security

- JWT tokens (7-day expiry)
- OTP expiry: 10 minutes
- Rate limiting: 200 req/15min
- Password bcrypt hashing (12 rounds)
- CORS configured for frontend origin

---

## 📧 Email Setup (Gmail)

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password: Google Account → Security → App Passwords

---

## 🧪 Demo

Without email configured, OTP is displayed in:
- Server console logs
- Frontend toast notification (dev mode)
- API response `devOtp` field

---

## 📈 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → sends OTP |
| POST | `/api/auth/verify-otp` | Verify OTP → get token |
| GET | `/api/market/tickers` | All live tickers |
| GET | `/api/market/klines/:symbol` | Candlestick data |
| POST | `/api/signals/generate` | Generate AI signal |
| POST | `/api/signals/chat` | Chat with AI agents |
| POST | `/api/signals/backtest` | Run backtest |
| GET | `/api/trades` | Get trades |
| POST | `/api/trades` | Place trade |
| PUT | `/api/trades/:id/close` | Close trade |
| GET | `/api/trades/stats` | Trade statistics |
| GET | `/api/watchlist` | Get watchlist |
| POST | `/api/watchlist/add` | Add to watchlist |
| GET | `/api/notifications` | Get notifications |

---

Data provided by [Binance API](https://binance-docs.github.io/apidocs/).
