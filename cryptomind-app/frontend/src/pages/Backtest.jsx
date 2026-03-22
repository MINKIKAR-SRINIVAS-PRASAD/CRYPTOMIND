import React, { useState } from 'react';
import { signalsAPI } from '../services/api';
import { formatPrice, formatPnL, TRADING_PAIRS } from '../utils/helpers';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import './Backtest.css';

const STRATEGIES = [
  { id: 'rsi_ema', name: 'RSI + EMA Strategy', desc: 'Buy when RSI < 35 & EMA20 > EMA50. Sell when RSI > 70.' },
  { id: 'macd', name: 'MACD Crossover', desc: 'Buy on MACD bullish crossover, sell on bearish crossover.' },
  { id: 'combined', name: 'Combined Multi-Indicator', desc: 'Score-based: RSI + EMA + MACD combined.' },
];

const Backtest = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [strategy, setStrategy] = useState('rsi_ema');
  const [capital, setCapital] = useState('10000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    if (!capital || parseFloat(capital) <= 0) { toast.error('Enter valid initial capital.'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await signalsAPI.backtest({ symbol, strategy, initialCapital: parseFloat(capital) });
      if (res.data.success) {
        setResult(res.data.result);
        toast.success('Backtest completed!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backtest failed.');
    } finally { setLoading(false); }
  };

  const buildEquityCurve = () => {
    if (!result?.trades) return [];
    let equity = result.initialCapital;
    return result.trades.map(t => {
      equity += t.pnl;
      return { date: t.exitDate, equity: parseFloat(equity.toFixed(2)) };
    });
  };

  const equityCurve = buildEquityCurve();

  return (
    <div className="backtest-page">

      <div className="backtest-header">
        <div>
          <h2 className="backtest-title">🔁 Backtesting Engine</h2>
          <p style={{ color: 'var(--text2)', fontSize: '.88rem', marginTop: 4 }}>
            Test trading strategies against historical crypto data
          </p>
        </div>
      </div>

      {/* ── CONFIG ── */}
      <div className="backtest-config">
        <div className="config-row">
          <div className="config-group">
            <label>Cryptocurrency</label>
            <select value={symbol} onChange={e => setSymbol(e.target.value)}>
              {TRADING_PAIRS.map(p => (
                <option key={p.symbol} value={p.symbol}>{p.icon} {p.name} ({p.symbol.replace('USDT', '/USDT')})</option>
              ))}
            </select>
          </div>
          <div className="config-group">
            <label>Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)}>
              {STRATEGIES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="config-group">
            <label>Initial Capital (USDT)</label>
            <input type="number" value={capital} onChange={e => setCapital(e.target.value)} placeholder="10000" />
          </div>
          <div className="config-group btn-group">
            <button className="btn-run" onClick={handleRun} disabled={loading}>
              {loading ? <><span className="spinner-sm" /> Running...</> : '▶ Run Backtest'}
            </button>
          </div>
        </div>

        <div className="strategy-info">
          <span style={{ color: 'var(--text3)', fontSize: '.8rem' }}>Strategy: </span>
          <span style={{ color: 'var(--text2)', fontSize: '.8rem' }}>
            {STRATEGIES.find(s => s.id === strategy)?.desc}
          </span>
        </div>
      </div>

      {/* ── RESULTS ── */}
      {loading && (
        <div className="backtest-loading">
          <div className="loading-dots"><span /><span /><span /></div>
          <div>Running backtest on {symbol.replace('USDT', '/USDT')} with {strategy} strategy...</div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Stats */}
          <div className="backtest-stats">
            {[
              { label: 'Initial Capital', value: `$${parseFloat(result.initialCapital).toLocaleString()}`, color: 'var(--text)' },
              { label: 'Final Capital', value: `$${parseFloat(result.finalCapital).toLocaleString()}`, color: result.finalCapital >= result.initialCapital ? 'var(--green)' : 'var(--red)' },
              { label: 'Total Return', value: `${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn}%`, color: result.totalReturn >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Win Rate', value: `${result.winRate}%`, color: 'var(--blue)' },
              { label: 'Total Trades', value: result.totalTrades, color: 'var(--text)' },
              { label: 'Max Drawdown', value: `-${result.maxDrawdown}%`, color: 'var(--red)' },
              { label: 'Sharpe Ratio', value: result.sharpeRatio, color: result.sharpeRatio > 1 ? 'var(--green)' : 'var(--gold)' },
              { label: 'W / L', value: `${result.wins} / ${result.losses}`, color: 'var(--text)' },
            ].map((s, i) => (
              <div key={i} className="bt-stat">
                <div className="bt-stat-label">{s.label}</div>
                <div className="bt-stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve */}
          {equityCurve.length > 0 && (
            <div className="backtest-chart-card">
              <div className="backtest-chart-title">Equity Curve</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={result.totalReturn >= 0 ? '#00e676' : '#ff3d57'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={result.totalReturn >= 0 ? '#00e676' : '#ff3d57'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0' }}
                    formatter={v => [`$${v.toLocaleString()}`, 'Equity']}
                  />
                  <Area type="monotone" dataKey="equity"
                    stroke={result.totalReturn >= 0 ? '#00e676' : '#ff3d57'}
                    strokeWidth={2.5} fill="url(#eqGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade Log */}
          {result.trades?.length > 0 && (
            <div className="backtest-trade-log">
              <div className="bt-log-header">Trade Log (last {result.trades.length})</div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Entry Date</th>
                      <th>Exit Date</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>P&L</th>
                      <th>P&L %</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text2)', fontSize: '.82rem' }}>{t.entryDate}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '.82rem' }}>{t.exitDate}</td>
                        <td className="mono">{formatPrice(t.entryPrice, 2)}</td>
                        <td className="mono">{formatPrice(t.exitPrice, 2)}</td>
                        <td className={`mono ${t.pnl >= 0 ? 'up' : 'down'}`}>{formatPnL(t.pnl)}</td>
                        <td className={`mono ${t.pnlPercent >= 0 ? 'up' : 'down'}`}>
                          {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent}%
                        </td>
                        <td>
                          <span className={`result-badge ${t.result.toLowerCase()}`}>{t.result}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="backtest-placeholder">
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔁</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Ready to Backtest</div>
          <div style={{ color: 'var(--text2)', fontSize: '.9rem' }}>Configure your strategy above and click Run to test it against historical data.</div>
        </div>
      )}
    </div>
  );
};

export default Backtest;
