import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', section: 'Main' },
  { path: '/signals', icon: '🤖', label: 'AI Signals', section: 'Main' },
  { path: '/watchlist', icon: '⭐', label: 'Watchlist', section: 'Main' },
  { path: '/trades', icon: '💹', label: 'Dummy Trades', section: 'Trading' },
  { path: '/analytics', icon: '📈', label: 'Analytics', section: 'Trading' },
  { path: '/backtest', icon: '🔁', label: 'Backtesting', section: 'Trading' },
  { path: '/settings', icon: '⚙️', label: 'Settings', section: 'Account' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const sections = [...new Set(navItems.map(n => n.section))];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
        <div className="logo-icon">₿</div>
        <span className="logo-text">CryptoMind</span>
      </div>

      <div className="connection-status">
        <div className={`conn-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span className="conn-label">{connected ? 'Live' : 'Connecting...'}</span>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section} className="nav-section">
            <div className="nav-label">{section}</div>
            {navItems.filter(n => n.section === section).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-section">
          <div className="nav-label">Account</div>
          <button className="nav-item logout-btn" onClick={logout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-pill" onClick={() => navigate('/settings')}>
          <div className="user-avatar">
            {user ? `${user.firstName?.[0]}${user.lastName?.[0]}`.toUpperCase() : 'CM'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <div className={`risk-badge risk-${user?.riskProfile}`}>
            {user?.riskProfile?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
