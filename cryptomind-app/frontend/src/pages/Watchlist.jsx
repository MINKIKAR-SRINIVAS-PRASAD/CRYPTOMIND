import React, { useState, useEffect, useCallback } from 'react';
import { watchlistAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatPrice, formatPercent, formatVolume, symbolToIcon, symbolToColor, TRADING_PAIRS } from '../utils/helpers';
import toast from 'react-hot-toast';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './Watchlist.css';

const Watchlist = () => {
  const { prices } = useSocket();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');

  const loadWatchlist = useCallback(async () => {
    try {
      const res = await watchlistAPI.get();
      if (res.data.success) setWatchlist(res.data.watchlist);
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  const handleAdd = async (symbol) => {
    setAdding(true);
    try {
      const res = await watchlistAPI.add(symbol);
      if (res.data.success) { toast.success(`${symbol} added to watchlist!`); loadWatchlist(); setShowAddModal(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add.'); }
    finally { setAdding(false); }
  };

  const handleRemove = async (symbol) => {
    try {
      const res = await watchlistAPI.remove(symbol);
      if (res.data.success) {
        setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
        toast.success(`${symbol} removed from watchlist.`);
      }
    } catch {}
  };

  // Merge live prices
  const enriched = watchlist.map(item => ({
    ...item,
    price: prices[item.symbol]?.price || item.price,
    priceChangePercent: prices[item.symbol]?.priceChangePercent ?? item.priceChangePercent,
  }));

  const filteredPairs = TRADING_PAIRS.filter(p =>
    !watchlist.find(w => w.symbol === p.symbol) &&
    (searchSymbol === '' || p.name.toLowerCase().includes(searchSymbol.toLowerCase()) || p.symbol.toLowerCase().includes(searchSymbol.toLowerCase()))
  );

  return (
    <div className="watchlist-page">

      <div className="watchlist-header">
        <h2>⭐ My Watchlist <span className="count-badge">{watchlist.length}/20</span></h2>
        <button className="btn-add-coin" onClick={() => setShowAddModal(true)}>+ Add Coin</button>
      </div>

      {loading ? (
        <div className="wl-loading">Loading watchlist...</div>
      ) : enriched.length === 0 ? (
        <div className="wl-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⭐</div>
          <div>Your watchlist is empty.</div>
          <button className="btn-add-coin" style={{ marginTop: 16 }} onClick={() => setShowAddModal(true)}>+ Add Your First Coin</button>
        </div>
      ) : (
        <div className="watchlist-grid">
          {enriched.map(item => {
            const isUp = (item.priceChangePercent || 0) >= 0;
            const sparkData = (item.sparkline || []).map((v, i) => ({ i, v }));

            return (
              <div key={item.symbol} className="watch-card">
                <div className="watch-card-top">
                  <div className="watch-coin">
                    <div className="watch-icon" style={{ background: symbolToColor(item.symbol) }}>
                      {symbolToIcon(item.symbol)}
                    </div>
                    <div>
                      <div className="watch-name">{item.name}</div>
                      <div className="watch-sym">{item.pair}</div>
                    </div>
                  </div>
                  <button className="watch-remove" onClick={() => handleRemove(item.symbol)}>✕</button>
                </div>

                <div className="watch-price">{formatPrice(item.price, 2)}</div>
                <div className={`watch-change ${isUp ? 'up' : 'down'}`}>
                  {isUp ? '▲' : '▼'} {formatPercent(item.priceChangePercent)} today
                </div>

                {sparkData.length > 0 && (
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`grad-${item.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isUp ? '#00e676' : '#ff3d57'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={isUp ? '#00e676' : '#ff3d57'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={isUp ? '#00e676' : '#ff3d57'}
                        strokeWidth={2} fill={`url(#grad-${item.symbol})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                <div className="watch-footer">
                  <div className="watch-stat">
                    <div className="wl">Volume</div>
                    <div className="wv">{formatVolume(item.quoteVolume || item.volume)}</div>
                  </div>
                  <div className="watch-stat">
                    <div className="wl">High 24h</div>
                    <div className="wv">{formatPrice(item.high24h, 2)}</div>
                  </div>
                  <div className="watch-stat">
                    <div className="wl">Low 24h</div>
                    <div className="wv">{formatPrice(item.low24h, 2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add to Watchlist</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <input className="modal-search" placeholder="Search coins..."
              value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)} />
            <div className="modal-coin-list">
              {filteredPairs.map(p => (
                <button key={p.symbol} className="modal-coin-row" onClick={() => handleAdd(p.symbol)} disabled={adding}>
                  <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{p.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text2)' }}>{p.symbol.replace('USDT', '/USDT')}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--blue)', fontSize: '.82rem' }}>+ Add</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
