import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signalsAPI, marketAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatPrice, formatPercent, symbolToIcon, symbolToName, TRADING_PAIRS } from '../utils/helpers';
import toast from 'react-hot-toast';
import './AISignals.css';

const AGENT_CONFIG = {
  conservative: { label: 'Conservative Agent', letter: 'C', color: 'var(--blue)', bg: 'rgba(59,130,246,0.15)', borderClass: 'blue-text' },
  aggressive:   { label: 'Aggressive Agent',   letter: 'A', color: 'var(--red)',  bg: 'rgba(255,61,87,0.15)',  borderClass: 'red-text' },
  technical:    { label: 'Technical Agent',     letter: 'T', color: 'var(--gold)', bg: 'rgba(245,158,11,0.15)', borderClass: 'gold-text' },
  judge:        { label: '⚖️ Judge Agent',      letter: 'J', color: 'var(--green)',bg: 'rgba(0,230,118,0.15)', borderClass: 'judge-text' },
};

const AISignals = () => {
  const { prices } = useSocket();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState('1h');
  const [currentSignal, setCurrentSignal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allSignals, setAllSignals] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const loadSignals = useCallback(async () => {
    try {
      const res = await signalsAPI.getAll({ limit: 10 });
      if (res.data.success) {
        setAllSignals(res.data.signals);
        if (res.data.signals.length > 0 && !currentSignal) {
          const latest = res.data.signals[0];
          setCurrentSignal(latest);
          setMessages(latest.agentDiscussion?.map(d => ({
            agentType: d.agentType, agentName: d.agentName, message: d.message, id: Math.random()
          })) || []);
        }
      }
    } catch {}
  }, [currentSignal]);

  useEffect(() => { loadSignals(); }, [loadSignals]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessages([]);
    try {
      const res = await signalsAPI.generate(selectedSymbol, selectedInterval);
      if (res.data.success) {
        const signal = res.data.signal;
        setCurrentSignal(signal);
        setAllSignals(prev => [signal, ...prev.slice(0, 9)]);

        // Animate messages one by one
        const discussion = signal.agentDiscussion || [];
        for (let i = 0; i < discussion.length; i++) {
          const d = discussion[i];
          await new Promise(resolve => setTimeout(resolve, 600 + i * 400));
          setMessages(prev => [...prev, { agentType: d.agentType, agentName: d.agentName, message: d.message, id: Math.random() }]);
        }
        toast.success('New AI signal generated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signal generation failed');
    } finally { setGenerating(false); }
  };

  const handleChat = async () => {
    const q = chatInput.trim();
    if (!q) return;

    // Add user message
    setMessages(prev => [...prev, { agentType: 'user', agentName: 'You', message: q, id: Math.random() }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await signalsAPI.chat(q, currentSignal?._id);
      if (res.data.success) {
        for (let i = 0; i < res.data.responses.length; i++) {
          const r = res.data.responses[i];
          await new Promise(resolve => setTimeout(resolve, i * 500));
          setMessages(prev => [...prev, { agentType: r.agentType, agentName: r.agentName, message: r.message, id: Math.random() }]);
        }
      }
    } catch (err) {
      toast.error('Chat error');
    } finally { setChatLoading(false); }
  };

  const currentPrice = prices[selectedSymbol]?.price || currentSignal?.entryPrice;
  const action = currentSignal?.action || 'HOLD';

  return (
    <div className="signals-page">

      {/* ── HEADER ── */}
      <div className="signals-header">
        <div>
          <h2 className="signals-title">🤖 AI Signals — Multi-Agent System</h2>
          <p className="signals-sub">AI agents debate and reach consensus on the best trade decision</p>
        </div>
        <span className="ai-live">● LIVE</span>
      </div>

      <div className="ai-chat-layout">

        {/* ── CHAT AREA ── */}
        <div className="chat-card">
          <div className="chat-header">
            <div className="chat-title">
              Agent Discussion
              <span className="ai-badge">AI POWERED</span>
            </div>
            <div className="chat-controls">
              <select className="sym-select" value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
                {TRADING_PAIRS.map(p => (
                  <option key={p.symbol} value={p.symbol}>{p.icon} {p.name}</option>
                ))}
              </select>
              <select className="sym-select" value={selectedInterval} onChange={e => setSelectedInterval(e.target.value)}>
                {['1m','5m','15m','1h','4h','1d'].map(iv => (
                  <option key={iv} value={iv}>{iv.toUpperCase()}</option>
                ))}
              </select>
              <button className="btn-generate" onClick={handleGenerate} disabled={generating}>
                {generating ? <><span className="spinner-sm" /> Analyzing...</> : '⚡ Generate Signal'}
              </button>
            </div>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.length === 0 && !generating && (
              <div className="chat-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤖</div>
                <div>Click <strong>⚡ Generate Signal</strong> to start AI analysis</div>
                <div style={{ fontSize: '.82rem', color: 'var(--text3)', marginTop: 6 }}>
                  Conservative, Aggressive & Technical agents will debate the market
                </div>
              </div>
            )}

            {generating && messages.length === 0 && (
              <div className="chat-loading">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
                <div>AI agents are analyzing {selectedSymbol.replace('USDT', '/USDT')}...</div>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.agentType === 'user') {
                return (
                  <div key={msg.id} className="user-msg">
                    <div className="user-bubble">{msg.message}</div>
                  </div>
                );
              }
              const cfg = AGENT_CONFIG[msg.agentType] || AGENT_CONFIG.judge;
              return (
                <div key={msg.id} className="agent-msg animate-in">
                  <div className="agent-avatar" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.letter}
                  </div>
                  <div className="agent-bubble">
                    <div className="agent-name" style={{ color: cfg.color }}>{msg.agentName}</div>
                    <div className={`agent-text ${cfg.borderClass}`}
                      dangerouslySetInnerHTML={{ __html: msg.message.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="chat-loading" style={{ padding: '8px 0' }}>
                <div className="loading-dots"><span /><span /><span /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              className="chat-input" placeholder="Ask AI agents anything… e.g. 'Analyze ETH/USDT breakout'"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
            />
            <button className="chat-send" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
              Ask →
            </button>
          </div>
        </div>

        {/* ── SIGNAL PANEL ── */}
        <div className="signal-panel">

          {/* Current Signal Summary */}
          <div className="signal-summary-card">
            <div className="ss-header">Current Signal</div>
            {currentSignal ? (
              <>
                <div className="ss-coin">
                  <span style={{ fontSize: '1.8rem' }}>{symbolToIcon(currentSignal.symbol)}</span>
                  <div>
                    <div className="ss-coin-name">{currentSignal.pair}</div>
                    <div className="ss-coin-price">{formatPrice(currentPrice, 2)}</div>
                  </div>
                </div>
                <div className={`ss-action ${action.toLowerCase()}`}>
                  {action === 'BUY' ? '🟢' : action === 'SELL' ? '🔴' : '🟡'} {action}
                </div>
                <div className="ss-levels">
                  <div className="ss-level">
                    <span className="lbl">Entry Price</span>
                    <span className="val ep">{formatPrice(currentSignal.entryPrice, 2)}</span>
                  </div>
                  <div className="ss-level">
                    <span className="lbl">Take Profit</span>
                    <span className="val tp">{formatPrice(currentSignal.takeProfitPrice, 2)}</span>
                  </div>
                  <div className="ss-level">
                    <span className="lbl">Stop Loss</span>
                    <span className="val sl">{formatPrice(currentSignal.stopLossPrice, 2)}</span>
                  </div>
                  <div className="ss-level">
                    <span className="lbl">R:R Ratio</span>
                    <span className="val" style={{ color: 'var(--blue)' }}>1 : {currentSignal.rrRatio}</span>
                  </div>
                </div>
                <div className="confidence-bar-wrap">
                  <div className="confidence-label">
                    <span>Confidence</span>
                    <span className="mono" style={{ color: 'var(--green)' }}>{currentSignal.confidence}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${currentSignal.confidence}%` }} />
                  </div>
                </div>

                {/* Technical Indicators */}
                {currentSignal.technicalIndicators && (
                  <div className="tech-indicators">
                    <div className="ti-header">Technical Indicators</div>
                    <div className="ti-grid">
                      <div className="ti-item">
                        <span className="ti-label">RSI</span>
                        <span className={`ti-val ${currentSignal.technicalIndicators.rsi > 70 ? 'down' : currentSignal.technicalIndicators.rsi < 30 ? 'up' : ''}`}>
                          {currentSignal.technicalIndicators.rsi?.toFixed(1)}
                        </span>
                      </div>
                      <div className="ti-item">
                        <span className="ti-label">MACD</span>
                        <span className={`ti-val ${currentSignal.technicalIndicators.macd > 0 ? 'up' : 'down'}`}>
                          {currentSignal.technicalIndicators.macd?.toFixed(2)}
                        </span>
                      </div>
                      <div className="ti-item">
                        <span className="ti-label">EMA 20</span>
                        <span className="ti-val">{formatPrice(currentSignal.technicalIndicators.ema20, 0)}</span>
                      </div>
                      <div className="ti-item">
                        <span className="ti-label">EMA 50</span>
                        <span className="ti-val">{formatPrice(currentSignal.technicalIndicators.ema50, 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-signal">
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📡</div>
                <div>No signal generated yet</div>
              </div>
            )}
          </div>

          {/* Agent Votes */}
          {currentSignal?.agentVotes?.length > 0 && (
            <div className="votes-card">
              <div className="ss-header">Agent Votes</div>
              {currentSignal.agentVotes.map((vote, i) => {
                const cfg = Object.values(AGENT_CONFIG)[i] || AGENT_CONFIG.judge;
                return (
                  <div key={i} className="vote-row">
                    <div className="vote-name" style={{ color: cfg.color }}>{vote.agentName}</div>
                    <div className="vote-bar-wrap">
                      <div className={`vote-bar ${vote.vote?.toLowerCase()}`}
                        style={{ width: `${vote.confidence}%` }} />
                    </div>
                    <div className={`vote-pct ${vote.vote === 'BUY' ? 'up' : vote.vote === 'SELL' ? 'down' : ''}`}>
                      {vote.vote}
                    </div>
                  </div>
                );
              })}
              {currentSignal.confidence && (
                <div className="vote-row" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div className="vote-name" style={{ color: 'var(--green)' }}>⚖️ Judge</div>
                  <div className="vote-bar-wrap">
                    <div className="vote-bar buy" style={{ width: `${currentSignal.confidence}%` }} />
                  </div>
                  <div className="vote-pct up">{currentSignal.confidence}%</div>
                </div>
              )}
            </div>
          )}

          {/* Signal History */}
          <div className="signals-history-card">
            <div className="ss-header">Signal History</div>
            {allSignals.slice(0, 6).map(sig => (
              <div key={sig._id} className="history-row" onClick={() => {
                setCurrentSignal(sig);
                setMessages(sig.agentDiscussion?.map(d => ({
                  agentType: d.agentType, agentName: d.agentName, message: d.message, id: Math.random()
                })) || []);
              }}>
                <div className="history-pair">
                  {symbolToIcon(sig.symbol)} {sig.pair}
                </div>
                <span className={`signal-type ${sig.action.toLowerCase()}`}>{sig.action}</span>
                <span className="history-conf">{sig.confidence}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AISignals;
