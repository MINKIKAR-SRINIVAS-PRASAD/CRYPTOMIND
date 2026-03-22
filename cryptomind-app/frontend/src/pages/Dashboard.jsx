import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { marketAPI, signalsAPI, tradesAPI } from '../services/api';
import { formatPrice, formatPercent, formatPnL, formatTimeAgo, symbolToName, symbolToIcon, symbolToColor } from '../utils/helpers';
import CandlestickChart from '../components/charts/CandlestickChart';
import './Dashboard.css';

const COINS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { prices } = useSocket();
  const [tickers, setTickers] = useState([]);
  const [signals, setSignals] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [klines, setKlines] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [tickerRes, signalRes, tradeRes, statsRes] = await Promise.all([
        marketAPI.getTickers(),
        signalsAPI.getLatest(),
        tradesAPI.getAll({ limit: 5 }),
        tradesAPI.getStats(),
      ]);
      if (tickerRes.data.success) setTickers(tickerRes.data.tickers);
      if (signalRes.data.success) setSignals(signalRes.data.signals.slice(0, 3));
      if (tradeRes.data.success) setRecentTrades(tradeRes.data.trades.slice(0, 4));
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Dashboard load error:', err.message);
    } finally { setLoading(false); }
  }, []);

  const loadKlines = useCallback(async () => {
    try {
      const res = await marketAPI.getKlines(selectedCoin, selectedInterval, 100);
      if (res.data.success) setKlines(res.data.klines);
    } catch {}
  }, [selectedCoin, selectedInterval]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadKlines(); }, [loadKlines]);

  // Merge live prices into tickers
  const enrichedTickers = tickers.map(t => ({
    ...t,
    price: prices[t.symbol]?.price || t.price,
    priceChangePercent: prices[t.symbol]?.priceChangePercent || t.priceChangePercent,
  }));

  const btcTicker = enrichedTickers.find(t => t.symbol === selectedCoin);

  return (
    <div className="dashboard-page">

      {/* ── STATS ROW ── */}
      <div className="stats-grid">
        {[
          { label: 'Portfolio Value', value: formatPrice(100000 + (stats?.totalPnl || 0), 2), change: `${stats?.totalPnl >= 0 ? '▲' : '▼'} ${formatPnL(stats?.totalPnl || 0)}`, up: (stats?.totalPnl || 0) >= 0 },
          { label: "Today's P&L", value: formatPnL(stats?.totalPnl || 0), change: `${(stats?.totalTrades || 0)} trades total`, up: (stats?.totalPnl || 0) >= 0 },
          { label: 'Total Trades', value: stats?.totalTrades || 0, change: `▲ ${stats?.openTrades || 0} open`, up: true },
          { label: 'Win Rate', value: `${(stats?.winRate || 0).toFixed(1)}%`, change: `${stats?.wins || 0}W / ${stats?.losses || 0}L`, up: (stats?.winRate || 0) >= 50 },
        ].map((s, i) => (
          <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.up ? 'up' : 'down'}`}>{s.value}</div>
            <span className={`stat-change ${s.up ? 'up' : 'down'}`}>{s.change}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div className="dash-grid">

        {/* Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-header-left">
              <div className="coin-selector">
                {COINS.slice(0, 5).map(c => (
                  <button key={c}
                    className={`coin-btn ${selectedCoin === c ? 'active' : ''}`}
                    onClick={() => setSelectedCoin(c)}>
                    {symbolToIcon(c)} {c.replace('USDT', '')}
                  </button>
                ))}
              </div>
              <div className="chart-price-row">
                <div className="chart-price">{formatPrice(btcTicker?.price, 2)}</div>
                <div className={`chart-change ${btcTicker?.priceChangePercent >= 0 ? 'up' : 'down'}`}>
                  {btcTicker?.priceChangePercent >= 0 ? '▲' : '▼'} {formatPercent(btcTicker?.priceChangePercent)}
                </div>
              </div>
            </div>
            <div className="interval-tabs">
              {INTERVALS.map(iv => (
                <button key={iv} className={`interval-btn ${selectedInterval === iv ? 'active' : ''}`}
                  onClick={() => setSelectedInterval(iv)}>
                  {iv.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-body">
            <CandlestickChart klines={klines} symbol={selectedCoin} />
          </div>
        </div>

        {/* Coin list */}
        <div className="coin-list-card">
          <div className="coin-list-header">
            <span className="coin-list-title">Top Coins</span>
            <button className="view-all" onClick={() => navigate('/watchlist')}>View All →</button>
          </div>
          {enrichedTickers.slice(0, 8).map(t => (
            <div key={t.symbol} className="coin-row" onClick={() => { setSelectedCoin(t.symbol); }}>
              <div className="coin-icon" style={{ background: symbolToColor(t.symbol) }}>
                {symbolToIcon(t.symbol)}
              </div>
              <div className="coin-info">
                <div className="coin-name">{symbolToName(t.symbol)}</div>
                <div className="coin-sym">{t.symbol.replace('USDT', '')}</div>
              </div>
              <div className="coin-price mono">{formatPrice(t.price, 2)}</div>
              <div className={`coin-chg ${t.priceChangePercent >= 0 ? 'up' : 'down'}`}>
                {t.priceChangePercent >= 0 ? '▲' : '▼'} {Math.abs(t.priceChangePercent).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM GRID ── */}
      <div className="dash-bottom">

        {/* AI Signals */}
        <div className="signal-card">
          <div className="signal-header">
            <div className="signal-title">🤖 AI Trade Signals <span className="ai-badge">LIVE</span></div>
            <button className="view-all" onClick={() => navigate('/signals')}>View All →</button>
          </div>
          <div className="signal-body">
            {signals.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '.88rem' }}>
                No signals yet. <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => navigate('/signals')}>Generate one →</span>
              </div>
            ) : signals.map(sig => (
              <div key={sig._id} className="signal-row" onClick={() => navigate('/signals')}>
                <div className="signal-coin">
                  <div className="signal-coin-icon">{symbolToIcon(sig.symbol)}</div>
                  <div>
                    <div className="signal-coin-name">{sig.pair}</div>
                    <div className="signal-coin-time">{formatTimeAgo(sig.createdAt)}</div>
                  </div>
                </div>
                <span className={`signal-type ${sig.action.toLowerCase()}`}>{sig.action}</span>
                <div className="signal-conf mono">{sig.confidence}% conf.</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="trade-card">
          <div className="trade-header">
            <span className="trade-title">Recent Trades</span>
            <button className="view-all" onClick={() => navigate('/trades')}>View All →</button>
          </div>
          {recentTrades.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '.88rem' }}>
              No trades yet. <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => navigate('/trades')}>Place one →</span>
            </div>
          ) : recentTrades.map(t => (
            <div key={t._id} className="trade-row">
              <div className={`trade-side ${t.side.toLowerCase()}`}>{t.side}</div>
              <div className="trade-info">
                <div className="trade-pair">{t.pair}</div>
                <div className="trade-date">{formatTimeAgo(t.openedAt)}</div>
              </div>
              <div className={`trade-pnl ${(t.pnl || 0) >= 0 ? 'pos' : 'neg'} mono`}>
                {formatPnL(t.pnl || 0)}
              </div>
              <div className={`trade-status status-${t.status.toLowerCase()}`}>
                ● {t.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
