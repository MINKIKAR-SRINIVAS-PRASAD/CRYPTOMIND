import React, { useState } from 'react';
import { tradesAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { TRADING_PAIRS } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TradeModal = ({ onClose, prefill = {} }) => {
  const { prices } = useSocket();
  const [form, setForm] = useState({
    pair: prefill.pair || 'BTC/USDT',
    side: prefill.side || 'BUY',
    entryPrice: prefill.entryPrice || '',
    amount: '1000',
    takeProfitPrice: prefill.takeProfitPrice || '',
    stopLossPrice: prefill.stopLossPrice || '',
    ...prefill
  });
  const [placing, setPlacing] = useState(false);

  const handlePairChange = (pair) => {
    const symbol = pair.replace('/', '').replace(' ', '');
    const livePrice = prices[symbol]?.price;
    setForm(f => ({ ...f, pair, entryPrice: livePrice ? livePrice.toFixed(2) : '' }));
  };

  const handlePlace = async () => {
    if (!form.entryPrice || !form.amount) { toast.error('Entry price and amount required.'); return; }
    setPlacing(true);
    try {
      const res = await tradesAPI.place(form);
      if (res.data.success) {
        toast.success(`${form.side} trade placed! 💹`);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed.');
    } finally { setPlacing(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 300, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 20,
        padding: 28, width: '100%', maxWidth: 480, animation: 'slideUp .3s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>⚡ Quick Trade</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Side Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 10, padding: 4, marginBottom: 18, border: '1px solid var(--border)' }}>
          {['BUY', 'SELL'].map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700,
                background: form.side === s ? (s === 'BUY' ? 'var(--green)' : 'var(--red)') : 'transparent',
                color: form.side === s ? '#fff' : 'var(--text2)',
                transition: 'all .2s', fontSize: '.9rem'
              }}>
              {s === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
            </button>
          ))}
        </div>

        {[
          { label: 'Pair', field: 'pair', type: 'select' },
          { label: 'Entry Price ($)', field: 'entryPrice', type: 'number', ph: '67200' },
          { label: 'Amount (USDT)', field: 'amount', type: 'number', ph: '1000' },
          { label: 'Take Profit ($)', field: 'takeProfitPrice', type: 'number', ph: 'Optional' },
          { label: 'Stop Loss ($)', field: 'stopLossPrice', type: 'number', ph: 'Optional' },
        ].map(({ label, field, type, ph }) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>
              {label}
            </label>
            {type === 'select' ? (
              <select value={form[field]} onChange={e => handlePairChange(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: '.88rem', outline: 'none' }}>
                {TRADING_PAIRS.map(p => (
                  <option key={p.symbol} value={`${p.symbol.replace('USDT', '')}/USDT`}>{p.icon} {p.symbol.replace('USDT', '/USDT')}</option>
                ))}
              </select>
            ) : (
              <input type={type} placeholder={ph} value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: '.88rem', outline: 'none' }} />
            )}
          </div>
        ))}

        <button onClick={handlePlace} disabled={placing}
          style={{
            width: '100%', padding: 13, borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '.95rem',
            background: form.side === 'BUY' ? 'linear-gradient(135deg, #00a854, #00e676)' : 'linear-gradient(135deg, #cc0000, #ff3d57)',
            color: '#fff', marginTop: 4, transition: 'opacity .2s',
            opacity: placing ? .6 : 1, cursor: placing ? 'not-allowed' : 'pointer'
          }}>
          {placing ? 'Placing...' : `${form.side === 'BUY' ? '🟢' : '🔴'} Place ${form.side} Trade`}
        </button>
      </div>
    </div>
  );
};

export default TradeModal;
