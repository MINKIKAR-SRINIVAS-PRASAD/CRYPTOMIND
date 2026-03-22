export const formatPrice = (price, decimals) => {
  if (!price && price !== 0) return '—';
  const p = parseFloat(price);
  if (isNaN(p)) return '—';
  
  // Auto-detect decimals
  if (decimals === undefined) {
    if (p >= 1000) decimals = 2;
    else if (p >= 1) decimals = 3;
    else decimals = 6;
  }
  
  return '$' + p.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatPercent = (pct) => {
  if (!pct && pct !== 0) return '—';
  const p = parseFloat(pct);
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
};

export const formatPnL = (pnl) => {
  if (!pnl && pnl !== 0) return '—';
  const p = parseFloat(pnl);
  const sign = p >= 0 ? '+' : '';
  return `${sign}$${Math.abs(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatVolume = (vol) => {
  if (!vol) return '—';
  const v = parseFloat(vol);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export const formatTimeAgo = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const symbolToName = (symbol) => {
  const names = {
    BTCUSDT: 'Bitcoin', ETHUSDT: 'Ethereum', SOLUSDT: 'Solana',
    BNBUSDT: 'Binance Coin', XRPUSDT: 'XRP', ADAUSDT: 'Cardano',
    DOGEUSDT: 'Dogecoin', AVAXUSDT: 'Avalanche', MATICUSDT: 'Polygon',
    DOTUSDT: 'Polkadot', LINKUSDT: 'Chainlink', LTCUSDT: 'Litecoin'
  };
  return names[symbol] || symbol.replace('USDT', '');
};

export const symbolToIcon = (symbol) => {
  const icons = {
    BTCUSDT: '₿', ETHUSDT: 'Ξ', SOLUSDT: '◎', BNBUSDT: '◈',
    XRPUSDT: '✕', ADAUSDT: '₳', DOGEUSDT: 'Ð', AVAXUSDT: '▲',
    MATICUSDT: '⬡', DOTUSDT: '●', LINKUSDT: '⬡', LTCUSDT: 'Ł'
  };
  return icons[symbol] || symbol.replace('USDT', '')[0];
};

export const symbolToColor = (symbol) => {
  const colors = {
    BTCUSDT: 'rgba(247,147,26,0.15)', ETHUSDT: 'rgba(98,126,234,0.15)',
    SOLUSDT: 'rgba(0,172,193,0.15)', BNBUSDT: 'rgba(245,158,11,0.15)',
    XRPUSDT: 'rgba(226,73,26,0.15)', ADAUSDT: 'rgba(0,82,172,0.15)',
    DOGEUSDT: 'rgba(194,158,34,0.15)', AVAXUSDT: 'rgba(232,65,66,0.15)'
  };
  return colors[symbol] || 'rgba(59,130,246,0.15)';
};

export const TRADING_PAIRS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎' },
  { symbol: 'BNBUSDT', name: 'Binance Coin', icon: '◈' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: '✕' },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: '₳' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: '▲' },
];
