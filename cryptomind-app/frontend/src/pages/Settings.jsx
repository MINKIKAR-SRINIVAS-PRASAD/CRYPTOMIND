import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    riskProfile: user?.riskProfile || 'moderate'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      if (res.data.success) {
        updateUser(res.data.user);
        toast.success('Profile updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ Settings</h2>

      {/* Profile */}
      <div className="settings-card">
        <div className="settings-card-title">👤 Profile Settings</div>
        <div className="form-grid">
          <div className="form-group">
            <label>First Name</label>
            <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user?.email || ''} disabled style={{ opacity: .6 }} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {/* Risk Profile */}
      <div className="settings-card">
        <div className="settings-card-title">🎯 Risk Profile</div>
        <div className="risk-options">
          {[
            { value: 'conservative', icon: '🛡️', label: 'Conservative', desc: 'Low risk, tight stops, smaller position sizes. Prioritize capital preservation.' },
            { value: 'moderate', icon: '⚖️', label: 'Moderate', desc: 'Balanced approach. Standard risk-reward ratios. Recommended for most traders.' },
            { value: 'aggressive', icon: '🚀', label: 'Aggressive', desc: 'High risk, wide targets, larger position sizes. Maximize potential returns.' },
          ].map(r => (
            <div key={r.value}
              className={`risk-card ${form.riskProfile === r.value ? 'selected' : ''}`}
              onClick={() => setForm(f => ({ ...f, riskProfile: r.value }))}>
              <div className="risk-icon">{r.icon}</div>
              <div className="risk-label">{r.label}</div>
              <div className="risk-desc">{r.desc}</div>
            </div>
          ))}
        </div>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Risk Profile'}
        </button>
      </div>

      {/* Account Info */}
      <div className="settings-card">
        <div className="settings-card-title">ℹ️ Account Information</div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Member Since</span>
            <span className="info-val">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email Verified</span>
            <span className={`info-val ${user?.isEmailVerified ? 'up' : 'down'}`}>
              {user?.isEmailVerified ? '✅ Verified' : '❌ Not Verified'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Virtual Balance</span>
            <span className="info-val mono">$100,000 USDT</span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Login</span>
            <span className="info-val">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Now'}</span>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="settings-card">
        <div className="settings-card-title">🔔 Notification Preferences</div>
        <div className="notif-settings">
          {[
            { label: 'Email alerts for AI signals', key: 'emailSignals', default: true },
            { label: 'Email alerts for trade updates', key: 'emailTrades', default: true },
            { label: 'Real-time browser notifications', key: 'browserNotifs', default: false },
          ].map(s => (
            <div key={s.key} className="notif-toggle-row">
              <span className="notif-toggle-label">{s.label}</span>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={s.default} onChange={() => toast('Preference saved!')} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
