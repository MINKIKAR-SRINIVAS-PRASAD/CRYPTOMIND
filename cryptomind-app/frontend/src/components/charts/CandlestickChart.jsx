import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const CandlestickChart = ({ klines = [], symbol = 'BTCUSDT', height = 300 }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [chartType, setChartType] = useState('candle'); // candle | line | area

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: 'DM Sans, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(59,130,246,0.4)', width: 1, style: 2 },
        horzLine: { color: 'rgba(59,130,246,0.4)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#94a3b8',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#94a3b8',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    chartInstanceRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff3d57',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff3d57',
    });
    candleSeriesRef.current = candleSeries;

    // Volume series (histogram at bottom)
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: 'rgba(59,130,246,0.3)',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !klines.length) return;

    const sorted = [...klines].sort((a, b) => a.time - b.time);

    if (chartType === 'candle') {
      candleSeriesRef.current.applyOptions({
        upColor: '#00e676', downColor: '#ff3d57',
        borderVisible: false, wickUpColor: '#00e676', wickDownColor: '#ff3d57',
      });
      candleSeriesRef.current.setData(sorted);
    } else if (chartType === 'line') {
      // Switch to line mode using candlestick with same color
      const lineData = sorted.map(k => ({
        time: k.time, open: k.close, high: k.close, low: k.close, close: k.close
      }));
      candleSeriesRef.current.setData(lineData);
      candleSeriesRef.current.applyOptions({
        upColor: '#3b82f6', downColor: '#3b82f6',
        wickUpColor: 'transparent', wickDownColor: 'transparent',
      });
    } else if (chartType === 'area') {
      const areaData = sorted.map(k => ({
        time: k.time, open: k.close, high: k.close, low: k.close, close: k.close
      }));
      candleSeriesRef.current.setData(areaData);
      candleSeriesRef.current.applyOptions({
        upColor: 'rgba(0,230,118,0.3)', downColor: 'rgba(0,230,118,0.3)',
        wickUpColor: 'transparent', wickDownColor: 'transparent',
      });
    }

    // Volume
    const volumeData = sorted.map(k => ({
      time: k.time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,87,0.3)'
    }));
    volumeSeriesRef.current?.setData(volumeData);

    // Fit content
    chartInstanceRef.current?.timeScale().fitContent();
  }, [klines, chartType]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {['candle', 'line', 'area'].map(type => (
          <button key={type} onClick={() => setChartType(type)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: chartType === type ? 'var(--blue-dim)' : 'var(--bg2)',
              color: chartType === type ? 'var(--blue)' : 'var(--text2)',
              fontSize: '.75rem', fontWeight: 600,
            }}>
            {type === 'candle' ? '📊 Candles' : type === 'line' ? '📈 Line' : '🏔️ Area'}
          </button>
        ))}
      </div>
      <div
        ref={chartRef}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
};

export default CandlestickChart;
