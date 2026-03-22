import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (user?._id) socket.emit('join', user._id);
      // Subscribe to all major pairs
      ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'].forEach(s => {
        socket.emit('subscribeTicker', s);
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('priceUpdate', (ticker) => {
      setPrices(prev => ({
        ...prev,
        [ticker.symbol]: ticker
      }));
    });

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(c => c + 1);
      // Show toast for signal notifications
      if (notif.type === 'signal') {
        toast.custom((t) => (
          <div style={{
            background: '#0f1729', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12, padding: '12px 16px', maxWidth: 320,
            display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{notif.title}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{notif.message}</div>
            </div>
          </div>
        ), { duration: 6000 });
      }
    });

    socket.on('tradeUpdated', (trade) => {
      // Can trigger context refresh
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  const subscribeTicker = useCallback((symbol) => {
    socketRef.current?.emit('subscribeTicker', symbol);
  }, []);

  const getPrice = useCallback((symbol) => {
    return prices[symbol]?.price || null;
  }, [prices]);

  const markRead = useCallback(() => setUnreadCount(0), []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      prices,
      notifications,
      unreadCount,
      subscribeTicker,
      getPrice,
      markRead,
      setNotifications,
      setUnreadCount
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
