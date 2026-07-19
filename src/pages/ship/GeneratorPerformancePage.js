import React, { useMemo } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

export default function GeneratorPerformancePage() {
  const { data, loading } = useShipData();
  const hourly = data?.hourly || [];

  const chartData = useMemo(() => hourly.map((h) => ({
    time: h.hour_ts.slice(5, 16).replace('T', ' '),
    frequency: h.sg_actual_frequency_hz,
    speed: h.sg_actual_speed_rpm,
    power: h.sg_actual_power_kw,
    current: h.sg_actual_current_a,
    voltage: h.sg_actual_voltage_v,
    mode: h.sg_system_mode,
  })), [hourly]);

  const freqScatter = useMemo(() => hourly
    .filter((h) => h.sg_actual_power_kw && h.sg_actual_power_kw > 50)
    .map((h) => ({ power: h.sg_actual_power_kw, freq: h.sg_actual_frequency_hz }))
    .slice(0, 200),
  [hourly]);

  const stats = useMemo(() => {
    const freqs = hourly.map((h) => h.sg_actual_frequency_hz).filter(Boolean);
    const speeds = hourly.map((h) => h.sg_actual_speed_rpm).filter(Boolean);
    const powers = hourly.map((h) => h.sg_actual_power_kw).filter(Boolean);
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      avgFreq: avg(freqs).toFixed(2),
      minFreq: freqs.length ? Math.min(...freqs).toFixed(2) : '—',
      maxFreq: freqs.length ? Math.max(...freqs).toFixed(2) : '—',
      avgSpeed: avg(speeds).toFixed(1),
      avgPower: avg(powers).toFixed(0),
    };
  }, [hourly]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading generator data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Generator Performance</h1>
          <p className="page-description">Beijing Maersk — Shaft Generator electrical performance metrics</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Avg Frequency</div>
          <div className="kpi-value">{stats.avgFreq}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>Hz</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Min / Max Freq</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>{stats.minFreq} / {stats.maxFreq} <span style={{ fontSize: 13, color: '#94a3b8' }}>Hz</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg Generator Speed</div>
          <div className="kpi-value">{stats.avgSpeed}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>rpm</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg SG Power</div>
          <div className="kpi-value">{stats.avgPower}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>kW</span></div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Generator Frequency (Hz) — April 2026</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 70]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Low warn 35Hz', fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'High warn 55Hz', fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={58} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crit 58Hz', fill: '#ef4444', fontSize: 10 }} />
            <Area type="monotone" dataKey="frequency" stroke="#3b82f6" fill="url(#freqGrad)" name="Frequency (Hz)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Generator Speed vs Frequency</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="speed" stroke="#22c55e" strokeWidth={2} dot={false} name="SG Speed (rpm)" />
            <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} dot={false} name="Frequency (Hz)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>SG Power Output Over Time</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="power" stroke="#a855f7" fill="url(#powerGrad)" name="SG Power (kW)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
