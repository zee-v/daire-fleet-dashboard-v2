import React, { useMemo, useState } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

const WINDING_METRICS = [
  { key: 'sg_winding_u1_temp', label: 'Gen Winding U1', color: '#3b82f6', baseline: 47.8, warn: 80 },
  { key: 'sg_winding_v1_temp', label: 'Gen Winding V1', color: '#22c55e', baseline: 47.7, warn: 80 },
  { key: 'sg_winding_w1_temp', label: 'Gen Winding W1', color: '#a855f7', baseline: 47.9, warn: 80 },
  { key: 'sg_winding_u2_temp', label: 'Gen Winding U2', color: '#f59e0b', baseline: 48.5, warn: 80 },
  { key: 'sg_winding_v2_temp', label: 'Gen Winding V2', color: '#ec4899', baseline: 48.4, warn: 80 },
  { key: 'sg_winding_w2_temp', label: 'Gen Winding W2', color: '#06b6d4', baseline: 48.4, warn: 80 },
  { key: 'sg_reactor_winding_l1_1_temp', label: 'Reactor L1.1', color: '#ef4444', baseline: 55.5, warn: 85 },
  { key: 'sg_reactor_winding_l1_2_temp', label: 'Reactor L1.2', color: '#84cc16', baseline: 57.9, warn: 85 },
  { key: 'sg_transformer_winding_2v_temp', label: 'Transformer 2V', color: '#fb923c', baseline: 53.1, warn: 80 },
  { key: 'sg_converter_coolant_temp', label: 'Coolant', color: '#38bdf8', baseline: 35.0, warn: 55 },
  { key: 'sg_air_temp_hot1', label: 'Air Hot 1', color: '#fbbf24', baseline: 40.0, warn: 65 },
  { key: 'sg_air_temp_cold1', label: 'Air Cold 1', color: '#818cf8', baseline: 35.0, warn: 55 },
];

export default function ThermalHealthPage() {
  const { data, loading } = useShipData();
  const hourly = data?.hourly || [];
  const [selectedGroup, setSelectedGroup] = useState('winding');

  const groups = {
    winding: WINDING_METRICS.filter((m) => m.key.startsWith('sg_winding')),
    reactor: WINDING_METRICS.filter((m) => m.key.startsWith('sg_reactor') || m.key.startsWith('sg_transformer')),
    cooling: WINDING_METRICS.filter((m) => m.key.includes('coolant') || m.key.includes('air')),
  };

  const activeGroup = groups[selectedGroup] || groups.winding;

  const chartData = useMemo(() => hourly.map((h) => {
    const row = { time: h.hour_ts.slice(5, 16).replace('T', ' ') };
    for (const m of WINDING_METRICS) row[m.key] = h[m.key];
    return row;
  }), [hourly]);

  const latestTemps = useMemo(() => {
    const latest = hourly[hourly.length - 1];
    if (!latest) return [];
    return WINDING_METRICS.map((m) => ({
      ...m,
      value: latest[m.key],
      status: latest[m.key] > m.warn ? 'Critical' : latest[m.key] > m.baseline * 1.2 ? 'Warning' : 'Normal',
    }));
  }, [hourly]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading thermal data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Thermal &amp; Winding Health</h1>
          <p className="page-description">Beijing Maersk — Generator winding, reactor, transformer and coolant temperatures</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}
          >
            <option value="winding">Generator Windings (U/V/W)</option>
            <option value="reactor">Reactor &amp; Transformer</option>
            <option value="cooling">Cooling &amp; Air Temps</option>
          </select>
        </div>
      </div>

      {/* Latest readings cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {latestTemps.map((m) => {
          const c = m.status === 'Critical' ? '#ef4444' : m.status === 'Warning' ? '#f59e0b' : '#22c55e';
          return (
            <div key={m.key} className="kpi-card">
              <div className="kpi-title" style={{ fontSize: 11 }}>{m.label}</div>
              <div className="kpi-value" style={{ color: c, fontSize: 24 }}>
                {m.value?.toFixed(1) ?? '—'}
                <span style={{ fontSize: 13, marginLeft: 3, color: '#94a3b8' }}>°C</span>
              </div>
              <div style={{ fontSize: 10, color: c, marginTop: 2 }}>{m.status}</div>
            </div>
          );
        })}
      </div>

      <div className="chart-container">
        <h3>
          {selectedGroup === 'winding' ? 'Generator Winding Temperatures' : selectedGroup === 'reactor' ? 'Reactor & Transformer Temperatures' : 'Cooling & Air Temperatures'} — April 2026
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            {activeGroup.map((m) => (
              <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.5} dot={false} name={m.label} />
            ))}
            <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warn 80°C', fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crit 100°C', fill: '#ef4444', fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Thermal Penalty Contribution Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hourly.map((h) => ({ time: h.hour_ts.slice(5, 16).replace('T', ' '), thermal: h.thermal_contrib }))}>
            <defs>
              <linearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 20]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="thermal" stroke="#a855f7" fill="url(#thermalGrad)" name="Thermal Penalty (0-20)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
