import React, { useMemo, useState } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

const METRICS = [
  { key: 'health_score', label: 'Health Score (%)', color: '#22c55e', domain: [0, 100] },
  { key: 'mechanical_contrib', label: 'Mechanical Penalty', color: '#ef4444', domain: [0, 30] },
  { key: 'electrical_contrib', label: 'Electrical Penalty', color: '#f59e0b', domain: [0, 25] },
  { key: 'thermal_contrib', label: 'Thermal Penalty', color: '#a855f7', domain: [0, 25] },
  { key: 'frequency_contrib', label: 'Frequency Penalty', color: '#3b82f6', domain: [0, 15] },
  { key: 'mismatch_contrib', label: 'RPM Mismatch Penalty', color: '#ec4899', domain: [0, 10] },
  { key: 'loading_contrib', label: 'Loading Penalty', color: '#06b6d4', domain: [0, 10] },
];

export default function ShipHistoricalTrendsPage() {
  const { data, loading } = useShipData();
  const [selectedMetric, setSelectedMetric] = useState('health_score');
  const hourly = data?.hourly || [];

  const chartData = useMemo(() => hourly.map((h) => ({
    time: h.hour_ts.slice(5, 16).replace('T', ' '),
    ...METRICS.reduce((acc, m) => ({ ...acc, [m.key]: h[m.key] }), {}),
  })), [hourly]);

  const dailyAvg = useMemo(() => {
    const byDay = {};
    for (const h of hourly) {
      const day = h.hour_ts.slice(0, 10);
      if (!byDay[day]) byDay[day] = { day: day.slice(5), count: 0, sum: {} };
      for (const m of METRICS) {
        byDay[day].sum[m.key] = (byDay[day].sum[m.key] || 0) + (h[m.key] || 0);
      }
      byDay[day].count++;
    }
    return Object.values(byDay).map((d) => ({
      day: d.day,
      ...METRICS.reduce((acc, m) => ({ ...acc, [m.key]: parseFloat((d.sum[m.key] / d.count).toFixed(2)) }), {}),
    }));
  }, [hourly]);

  const selected = METRICS.find((m) => m.key === selectedMetric) || METRICS[0];

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading historical data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Historical Trends</h1>
          <p className="page-description">Beijing Maersk — Health score and penalty breakdown over April 2026</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}
          >
            {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="chart-container">
        <h3>{selected.label} — Hourly (April 2026)</h3>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={selected.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={selected.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={selected.domain} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            {selectedMetric === 'health_score' && (
              <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Alert 55', fill: '#f59e0b', fontSize: 11 }} />
            )}
            <Area type="monotone" dataKey={selectedMetric} stroke={selected.color} fill="url(#trendGrad)" name={selected.label} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Daily Average — All Penalty Components</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyAvg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            {METRICS.filter((m) => m.key !== 'health_score').map((m) => (
              <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={false} name={m.label} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Daily Health Score Average</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyAvg}>
            <defs>
              <linearGradient id="dailyHealthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="health_score" stroke="#22c55e" fill="url(#dailyHealthGrad)" name="Avg Health Score" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
