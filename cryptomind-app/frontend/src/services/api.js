import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 15000,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('cm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Handle expired tokens
API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cm_token');
      localStorage.removeItem('cm_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  sendOTP: (email) => API.post('/auth/send-otp', { email }),
  verifyOTP: (email, otp) => API.post('/auth/verify-otp', { email, otp }),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// ── MARKET ────────────────────────────────────────────────────────────────
export const marketAPI = {
  getPrices: () => API.get('/market/prices'),
  getTickers: () => API.get('/market/tickers'),
  getKlines: (symbol, interval = '1h', limit = 100) =>
    API.get(`/market/klines/${symbol}?interval=${interval}&limit=${limit}`),
  getTicker: (symbol) => API.get(`/market/ticker/${symbol}`),
};

// ── SIGNALS ───────────────────────────────────────────────────────────────
export const signalsAPI = {
  getAll: (params) => API.get('/signals', { params }),
  getLatest: () => API.get('/signals/latest'),
  generate: (symbol, interval) => API.post('/signals/generate', { symbol, interval }),
  chat: (query, signalId) => API.post('/signals/chat', { query, signalId }),
  getById: (id) => API.get(`/signals/${id}`),
  backtest: (data) => API.post('/signals/backtest', data),
};

// ── TRADES ────────────────────────────────────────────────────────────────
export const tradesAPI = {
  getAll: (params) => API.get('/trades', { params }),
  getStats: () => API.get('/trades/stats'),
  place: (data) => API.post('/trades', data),
  close: (id, exitPrice) => API.put(`/trades/${id}/close`, { exitPrice }),
};

// ── WATCHLIST ─────────────────────────────────────────────────────────────
export const watchlistAPI = {
  get: () => API.get('/watchlist'),
  add: (symbol) => API.post('/watchlist/add', { symbol }),
  remove: (symbol) => API.delete(`/watchlist/${symbol}`),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => API.get('/notifications', { params }),
  readAll: () => API.put('/notifications/read-all'),
  read: (id) => API.put(`/notifications/${id}/read`),
  delete: (id) => API.delete(`/notifications/${id}`),
};

export default API;
