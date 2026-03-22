import React, { useState, useEffect, useCallback } from 'react';
import { tradesAPI } from '../services/api';
import { formatPnL, formatPrice } from '../utils/helpers';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Analytics.css';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, tradeRes] = await Promise.all([
        tradesAPI.getStats(),
        tradesAPI.getAll({ limit: 100, status: 'CLOSED' }),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (tradeRes.data.success) setTrades(tradeRes.data.trades);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build cumulative PnL chart data
  const buildCumulativePnL = () => {
    let cumulative = 0;
    return trades.slice().reverse().map(t => {
      cumulative += t.pnl || 0;
      return {
        date: t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        pnl: parseFloat(cumulative.toFixed(2))
      };
    });
  };

  // Build weekly trade count
  const buildWeeklyVolume = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    trades.forEach(t => {
      const day = new Date(t.openedAt).getDay();
      const idx = day === 0 ? 6 : day - 1;
      counts[idx]++;
    });
    return days.map((d, i) => ({ day: d, trades: counts[i] }));
  };

  // Build PnL distribution
  const buildPnlDistribution = () => {
    const buckets = { '-$500+': 0, '-$200 to -$500': 0, '-$1 to -$200': 0, '$0 to $200': 0, '$200 to $500': 0, '$500+': 0 };
    trades.forEach(t => {
      const p = t.pnl || 0;
      if (p < -500) buckets['-$500+']++;
      else if (p < -200) buckets['-$200 to -$500']++;
      else if (p < 0) buckets['-$1 to -$200']++;
      else if (p < 200) buckets['$0 to $200']++;
      else if (p < 500) buckets['$200 to $500']++;
      else buckets['$500+']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  };

  const cumulativePnL = buildCumulativePnL();
  const weeklyVolume = buildWeeklyVolume();
  const pnlDistribution = buildPnlDistribution();
  const winLossData = [
    { name: 'Wins', value: stats?.wins || 0, color: '#00e676' },
    { name: 'Losses', value: stats?.losses || 0, color: '#ff3d57' },
  ];

  const TOOLTIP_STYLE = {
    contentStyle: { background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0' },
    labelStyle: { color: '#94a3b8', fontSize: 12 },
  };

  return (
    <div className="analytics-page">

      {/* ── STATS ROW ── */}
      <div className="stats-grid">
        {[
          { label: 'Total Return', value: `${(stats?.totalPnl || 0) >= 0 ? '+' : ''}${formatPnL(stats?.totalPnl || 0)}`, sub: 'All time', up: (stats?.totalPnl || 0) >= 0 },
          { label: 'Sharpe Ratio', value: stats?.profitFactor ? (stats.profitFactor * 0.5).toFixed(2) : '0.00', sub: stats?.profitFactor > 1 ? '▲ Good' : '▼ Low', up: (stats?.profitFactor || 0) > 1 },
          { label: 'Best Trade', value: formatPnL(stats?.bestTrade || 0), sub: 'Single trade', up: true },
          { label: 'Avg Trade P&L', value: formatPnL(stats?.avgPnl || 0), sub: `${stats?.closedTrades || 0} closed trades`, up: (stats?.avgPnl || 0) >= 0 },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.up ? 'up' : 'down'}`}>{s.value}</div>
            <span className={`stat-change ${s.up ? 'up' : 'down'}`}>{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="analytics-grid">

        {/* Cumulative P&L */}
        <div className="analytics-card full-width">
          <div className="analytics-header">
            <div className="analytics-title">Cumulative P&L Over Time</div>
          </div>
          <div className="analytics-body">
            {cumulativePnL.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cumulativePnL}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={v => [formatPnL(v), 'Cum. P&L']} />
                  <Area type="monotone" dataKey="pnl" stroke="#00e676" strokeWidth={2.5} fill="url(#pnlGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No closed trades yet. Start trading to see analytics!</div>
            )}
          </div>
        </div>

        {/* Win/Loss Pie */}
        <div className="analytics-card">
          <div className="analytics-header"><div className="analytics-title">Win / Loss Ratio</div></div>
          <div className="analytics-body">
            <div className="donut-wrap">
              <PieChart width={120} height={120}>
                <Pie data={winLossData} cx={55} cy={55} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {winLossData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
              <div className="donut-legend">
                {winLossData.map((item, i) => (
                  <div key={i} className="legend-item">
                    <div className="legend-dot" style={{ background: item.color }} />
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-val" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'var(--text3)' }} />
                  <span className="legend-label">Win Rate</span>
                  <span className="legend-val">{(stats?.winRate || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="analytics-card">
          <div className="analytics-header"><div className="analytics-title">Weekly Trade Volume</div></div>
          <div className="analytics-body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyVolume}>
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Trades']} />
                <Bar dataKey="trades" fill="rgba(59,130,246,0.6)" stroke="#3b82f6" strokeWidth={1} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="analytics-card">
          <div className="analytics-header"><div className="analytics-title">Key Performance Metrics</div></div>
          <div className="analytics-body">
            <div className="perf-metrics">
              {[
                { label: 'Best Trade', value: formatPnL(stats?.bestTrade || 0), color: 'var(--green)' },
                { label: 'Worst Trade', value: formatPnL(stats?.worstTrade || 0), color: 'var(--red)' },
                { label: 'Profit Factor', value: (stats?.profitFactor || 0).toFixed(2), color: 'var(--blue)' },
                { label: 'Accuracy', value: `${(stats?.winRate || 0).toFixed(1)}%`, color: 'var(--text)' },
                { label: 'Total Trades', value: stats?.totalTrades || 0, color: 'var(--text)' },
                { label: 'Open Trades', value: stats?.openTrades || 0, color: 'var(--blue)' },
              ].map((m, i) => (
                <div key={i} className="metric-box">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* P&L Distribution */}
        <div className="analytics-card">
          <div className="analytics-header"><div className="analytics-title">P&L Distribution</div></div>
          <div className="analytics-body">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={pnlDistribution} layout="vertical">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Trades']} />
                <Bar dataKey="count" fill="rgba(0,230,118,0.5)" stroke="#00e676" strokeWidth={1} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
