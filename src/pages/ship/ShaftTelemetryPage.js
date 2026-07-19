import React, { useMemo } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

export default function ShaftTelemetryPage() {
  const { data, loading } = useShipData();
  const hourly = data?.hourly || [];

  const chartData = useMemo(() => hourly.map((h) => ({
    time: h.hour_ts.slice(5, 16).replace('T', ' '),
    rpm: h.shaft_rpm,
    power_mw: h.shaft_power_kw != null ? parseFloat((h.shaft_power_kw / 1000).toFixed(3)) : null,
    torque: h.shaft_torque_knm,
    sg_speed: h.sg_actual_speed_rpm,
    mismatch: h.shaft_rpm && h.sg_actual_speed_rpm
      ? parseFloat(Math.abs(h.shaft_rpm - h.sg_actual_speed_rpm).toFixed(3))
      : null,
  })), [hourly]);

  const stats = useMemo(() => {
    const rpms = hourly.map((h) => h.shaft_rpm).filter(Boolean);
    const powers = hourly.map((h) => h.shaft_power_kw).filter(Boolean);
    const torques = hourly.map((h) => h.shaft_torque_knm).filter(Boolean);
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      avgRpm: avg(rpms).toFixed(1),
      maxRpm: rpms.length ? Math.max(...rpms).toFixed(1) : '—',
      avgPowerMW: (avg(powers) / 1000).toFixed(2),
      maxPowerMW: powers.length ? (Math.max(...powers) / 1000).toFixed(2) : '—',
      avgTorque: avg(torques).toFixed(0),
    };
  }, [hourly]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading shaft data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Shaft Telemetry</h1>
          <p className="page-description">Beijing Maersk — Main engine shaft RPM, power, torque and shaft-generator coupling</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Avg Shaft RPM</div>
          <div className="kpi-value">{stats.avgRpm}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>rpm</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Max Shaft RPM</div>
          <div className="kpi-value">{stats.maxRpm}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>rpm</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg Shaft Power</div>
          <div className="kpi-value">{stats.avgPowerMW}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>MW</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Avg Shaft Torque</div>
          <div className="kpi-value">{stats.avgTorque}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>kNm</span></div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Shaft RPM vs SG Speed — Coupling Alignment</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Low warn 30rpm', fill: '#f59e0b', fontSize: 10 }} />
            <Line type="monotone" dataKey="rpm" stroke="#22c55e" strokeWidth={2} dot={false} name="Shaft RPM" />
            <Line type="monotone" dataKey="sg_speed" stroke="#3b82f6" strokeWidth={2} dot={false} name="SG Speed (rpm)" strokeDasharray="6 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Shaft-Generator Speed Mismatch (absolute, rpm)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="mismatchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="mismatch" stroke="#ef4444" fill="url(#mismatchGrad)" name="|Shaft - SG| RPM" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Shaft Power (MW) and Torque (kNm)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={23} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <ReferenceLine yAxisId="left" y={35} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warn 35MW', fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine yAxisId="left" y={40} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crit 40MW', fill: '#ef4444', fontSize: 10 }} />
            <Line yAxisId="left" type="monotone" dataKey="power_mw" stroke="#a855f7" strokeWidth={2} dot={false} name="Shaft Power (MW)" />
            <Line yAxisId="right" type="monotone" dataKey="torque" stroke="#f59e0b" strokeWidth={2} dot={false} name="Torque (kNm)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
