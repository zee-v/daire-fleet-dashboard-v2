import React, { useMemo } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

export default function EnergyEfficiencyPage() {
  const { data, loading } = useShipData();
  const hourly = data?.hourly || [];

  const chartData = useMemo(() => hourly.map((h) => ({
    time: h.hour_ts.slice(5, 16).replace('T', ' '),
    sg_power: h.sg_actual_power_kw,
    shaft_power: h.shaft_power_kw != null ? parseFloat((h.shaft_power_kw / 1000).toFixed(2)) : null,
    energy_gwh: h.sg_energy_kwh != null ? parseFloat((h.sg_energy_kwh / 1e6).toFixed(4)) : null,
    current: h.sg_actual_current_a,
    voltage: h.sg_actual_voltage_v,
    available: h.sg_available_power_pct,
    efficiency: (h.sg_actual_power_kw && h.sg_available_power_pct)
      ? parseFloat(((h.sg_actual_power_kw / (h.sg_available_power_pct / 100 * 2500)) * 100).toFixed(1))
      : null,
  })), [hourly]);

  const dailyEnergy = useMemo(() => {
    const byDay = {};
    for (const h of hourly) {
      const day = h.hour_ts.slice(0, 10);
      if (!byDay[day]) byDay[day] = { day, energyStart: h.sg_energy_kwh, energyEnd: h.sg_energy_kwh, powerSum: 0, count: 0 };
      byDay[day].energyEnd = h.sg_energy_kwh;
      if (h.sg_actual_power_kw) { byDay[day].powerSum += h.sg_actual_power_kw; byDay[day].count++; }
    }
    return Object.values(byDay).map((d) => ({
      day: d.day.slice(5),
      energy_generated: d.energyEnd && d.energyStart ? parseFloat(((d.energyEnd - d.energyStart) / 1000).toFixed(1)) : null,
      avg_power: d.count ? parseFloat((d.powerSum / d.count).toFixed(1)) : null,
    })).filter((d) => d.energy_generated != null && d.energy_generated > 0);
  }, [hourly]);

  const ov = data?.overview;
  const totalEnergyGWh = ov?.latest_energy_kwh ? (ov.latest_energy_kwh / 1e6).toFixed(2) : '—';

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading energy data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Energy &amp; Efficiency</h1>
          <p className="page-description">Beijing Maersk — Shaft Generator energy production and power utilisation</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>⚡</div>
          <div className="kpi-title">Cumulative Energy</div>
          <div className="kpi-value">{totalEnergyGWh}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>GWh</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>⚙</div>
          <div className="kpi-title">Latest SG Power</div>
          <div className="kpi-value">{ov?.latest_sg_power_kw?.toFixed(0)}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>kW</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>〰</div>
          <div className="kpi-title">Latest Current</div>
          <div className="kpi-value">{ov?.latest_current_a?.toFixed(0)}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>A</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>⚡</div>
          <div className="kpi-title">Latest Shaft Power</div>
          <div className="kpi-value">{ov?.latest_power_kw ? (ov.latest_power_kw / 1000).toFixed(1) : '—'}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>MW</span></div>
        </div>
      </div>

      <div className="chart-container">
        <h3>SG Power &amp; Available Capacity (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sgPowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 110]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="sg_power" stroke="#22c55e" fill="url(#sgPowerGrad)" name="SG Power (kW)" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="available" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Available (%)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Current &amp; Voltage</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <ReferenceLine yAxisId="left" y={1800} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warn 1800A', fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine yAxisId="left" y={2200} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crit 2200A', fill: '#ef4444', fontSize: 10 }} />
            <Line yAxisId="left" type="monotone" dataKey="current" stroke="#a855f7" strokeWidth={2} dot={false} name="Current (A)" />
            <Line yAxisId="right" type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Voltage (V)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Daily Energy Generated (MWh)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyEnergy}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="energy_generated" fill="#22c55e" name="Daily Energy (MWh)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
