import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { notificationsAPI } from '../../services/api';
import { formatTimeAgo } from '../../utils/helpers';
import './Topbar.css';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/signals': 'AI Signals',
  '/watchlist': 'Watchlist',
  '/trades': 'Dummy Trades',
  '/analytics': 'Analytics',
  '/backtest': 'Backtesting',
  '/settings': 'Settings',
};

const Topbar = ({ onNewTrade }) => {
  const { user } = useAuth();
  const { connected, notifications, unreadCount, markRead } = useSocket();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const [dbNotifs, setDbNotifs] = useState([]);

  const title = pageTitles[location.pathname] || 'Dashboard';

  // Load DB notifications on open
  useEffect(() => {
    if (showNotifs) {
      notificationsAPI.getAll({ limit: 20 }).then(({ data }) => {
        if (data.success) setDbNotifs(data.notifications);
      }).catch(() => {});
      markRead();
    }
  }, [showNotifs, markRead]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allNotifs = [...notifications.slice(0, 5), ...dbNotifs].reduce((acc, n) => {
    const id = n._id || n.title;
    if (!acc.find(x => (x._id || x.title) === id)) acc.push(n);
    return acc;
  }, []).slice(0, 15);

  const handleReadAll = async () => {
    try {
      await notificationsAPI.readAll();
      markRead();
    } catch {}
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <div className="market-status">
          <div className="market-dot" />
          <span>Market Open</span>
        </div>

        <button className="btn-new-trade" onClick={onNewTrade}>
          + New Trade
        </button>

        <div className="notif-wrap" ref={notifRef}>
          <button className="notif-btn" onClick={() => setShowNotifs(s => !s)}>
            🔔
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                <button className="notif-read-all" onClick={handleReadAll}>Mark all read</button>
              </div>
              <div className="notif-list">
                {allNotifs.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : allNotifs.map((n, i) => (
                  <div key={n._id || i} className={`notif-item ${!n.read && n._id ? 'unread' : ''}`}>
                    <div className="notif-dot-type">
                      {n.type === 'signal' ? '🤖' : n.type === 'trade' ? '💹' : n.type === 'alert' ? '⚠️' : '🔔'}
                    </div>
                    <div className="notif-content">
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{formatTimeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="topbar-avatar">
          {user ? `${user.firstName?.[0]}${user.lastName?.[0]}`.toUpperCase() : 'CM'}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
