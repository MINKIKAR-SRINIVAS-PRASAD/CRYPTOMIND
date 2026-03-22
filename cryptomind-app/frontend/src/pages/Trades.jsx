import React, { useState, useEffect, useCallback } from 'react';
import { tradesAPI, marketAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatPrice, formatPnL, formatPercent, formatTimeAgo, symbolToIcon, TRADING_PAIRS } from '../utils/helpers';
import toast from 'react-hot-toast';
import './Trades.css';

const Trades = () => {
  const { prices } = useSocket();
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({
    pair: 'BTC/USDT', side: 'BUY', entryPrice: '', amount: '1000', takeProfitPrice: '', stopLossPrice: ''
  });

  const loadData = useCallback(async () => {
    try {
      const [tradeRes, statsRes] = await Promise.all([
        tradesAPI.getAll({ limit: 50 }),
        tradesAPI.getStats()
      ]);
      if (tradeRes.data.success) setTrades(tradeRes.data.trades);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill entry price from live prices
  const handlePairChange = (pair) => {
    const symbol = pair.replace('/', '');
    const livePrice = prices[symbol]?.price;
    setForm(f => ({ ...f, pair, entryPrice: livePrice ? livePrice.toFixed(2) : '' }));
  };

  const handlePlaceTrade = async () => {
    const { pair, side, entryPrice, amount } = form;
    if (!entryPrice || !amount) { toast.error('Please enter entry price and amount.'); return; }
    setPlacing(true);
    try {
      const res = await tradesAPI.place({ ...form, pair: pair.includes('/') ? pair : pair.replace('USDT', '/USDT') });
      if (res.data.success) {
        setTrades(prev => [res.data.trade, ...prev]);
        toast.success('Trade placed successfully! 💹');
        setForm(f => ({ ...f, entryPrice: '', amount: '1000', takeProfitPrice: '', stopLossPrice: '' }));
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed.');
    } finally { setPlacing(false); }
  };

  const handleCloseTrade = async (tradeId) => {
    try {
      const res = await tradesAPI.close(tradeId);
      if (res.data.success) {
        toast.success(`Trade closed. P&L: ${formatPnL(res.data.trade.pnl)}`);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Close failed.');
    }
  };

  const filteredTrades = filter === 'ALL' ? trades :
    trades.filter(t => filter === 'OPEN' ? t.status === 'OPEN' : t.status !== 'OPEN');

  return (
    <div className="trades-page">

      {/* ── STATS ── */}
      <div className="trades-top">
        <div className="perf-card">
          <div className="perf-label">Total P&L</div>
          <div className={`perf-value ${(stats?.totalPnl || 0) >= 0 ? 'up' : 'down'}`}>
            {formatPnL(stats?.totalPnl || 0)}
          </div>
        </div>
        <div className="perf-card">
          <div className="perf-label">Win Rate</div>
          <div className="perf-value" style={{ color: 'var(--blue)' }}>
            {(stats?.winRate || 0).toFixed(1)}%
          </div>
        </div>
        <div className="perf-card">
          <div className="perf-label">Total Trades</div>
          <div className="perf-value">{stats?.totalTrades || 0}</div>
        </div>
        <div className="perf-card">
          <div className="perf-label">Open Trades</div>
          <div className="perf-value" style={{ color: 'var(--blue)' }}>{stats?.openTrades || 0}</div>
        </div>
      </div>

      {/* ── PLACE TRADE FORM ── */}
      <div className="new-trade-form">
        <div className="form-title">⚡ Place Dummy Trade</div>
        <div className="form-row">
          <div className="form-col">
            <label>Coin Pair</label>
            <select value={form.pair} onChange={e => handlePairChange(e.target.value)}>
              {TRADING_PAIRS.map(p => (
                <option key={p.symbol} value={`${p.symbol.replace('USDT', '')}/USDT`}>
                  {p.icon} {p.symbol.replace('USDT', '')}/USDT
                </option>
              ))}
            </select>
          </div>
          <div className="form-col">
            <label>Side</label>
            <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option>BUY</option>
              <option>SELL</option>
            </select>
          </div>
          <div className="form-col">
            <label>Entry Price ($)</label>
            <input type="number" placeholder="e.g. 67200" value={form.entryPrice}
              onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} />
          </div>
          <div className="form-col">
            <label>Amount (USDT)</label>
            <input type="number" placeholder="1000" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-col">
            <label>Take Profit ($)</label>
            <input type="number" placeholder="Optional" value={form.takeProfitPrice}
              onChange={e => setForm(f => ({ ...f, takeProfitPrice: e.target.value }))} />
          </div>
          <div className="form-col">
            <label>Stop Loss ($)</label>
            <input type="number" placeholder="Optional" value={form.stopLossPrice}
              onChange={e => setForm(f => ({ ...f, stopLossPrice: e.target.value }))} />
          </div>
          <div className="form-col form-col-action">
            <button
              className={`trade-submit ${form.side === 'BUY' ? 'buy' : 'sell'}`}
              onClick={handlePlaceTrade} disabled={placing}>
              {placing ? <span className="spinner-sm" /> : `${form.side === 'BUY' ? '🟢' : '🔴'} Place ${form.side}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── TRADE TABLE ── */}
      <div className="trades-table-wrap">
        <div className="table-header">
          <span className="table-title">Trade History</span>
          <div className="filter-tabs">
            {['ALL', 'OPEN', 'CLOSED'].map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}>
                {f} {f === 'OPEN' && stats?.openTrades > 0 ? `(${stats.openTrades})` : ''}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="table-loading">Loading trades...</div>
        ) : filteredTrades.length === 0 ? (
          <div className="table-empty">No {filter !== 'ALL' ? filter.toLowerCase() : ''} trades found. Place your first trade above! 💹</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Side</th>
                  <th>Entry</th>
                  <th>TP</th>
                  <th>SL</th>
                  <th>Amount</th>
                  <th>Current</th>
                  <th>P&L</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => {
                  const symbol = trade.symbol || trade.pair?.replace('/', '');
                  const livePrice = prices[symbol]?.price;
                  let livePnl = trade.pnl || 0;
                  if (trade.status === 'OPEN' && livePrice) {
                    livePnl = trade.side === 'BUY'
                      ? ((livePrice - trade.entryPrice) / trade.entryPrice) * trade.amount
                      : ((trade.entryPrice - livePrice) / trade.entryPrice) * trade.amount;
                  }
                  return (
                    <tr key={trade._id}>
                      <td><strong>{symbolToIcon(symbol)} {trade.pair}</strong></td>
                      <td><span className={`badge-side ${trade.side.toLowerCase()}`}>{trade.side}</span></td>
                      <td className="mono">{formatPrice(trade.entryPrice, 2)}</td>
                      <td className="mono up">{trade.takeProfitPrice ? formatPrice(trade.takeProfitPrice, 2) : '—'}</td>
                      <td className="mono down">{trade.stopLossPrice ? formatPrice(trade.stopLossPrice, 2) : '—'}</td>
                      <td className="mono">${parseFloat(trade.amount).toLocaleString()}</td>
                      <td className="mono">{livePrice ? formatPrice(livePrice, 2) : '—'}</td>
                      <td className={`mono ${livePnl >= 0 ? 'up' : 'down'}`}>
                        {formatPnL(livePnl)}
                        {trade.status === 'OPEN' && livePrice && <span className="live-tag"> LIVE</span>}
                      </td>
                      <td>
                        <span className={`status-tag ${trade.status.toLowerCase()}`}>
                          ● {trade.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text3)', fontSize: '.75rem' }}>
                        {formatTimeAgo(trade.openedAt)}
                      </td>
                      <td>
                        {trade.status === 'OPEN' && (
                          <button className="btn-close-trade" onClick={() => handleCloseTrade(trade._id)}>
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trades;
