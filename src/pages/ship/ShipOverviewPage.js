import React, { useMemo } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

function StatCard({ label, value, unit, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{label}</div>
      <div className="kpi-value" style={color ? { color } : {}}>
        {value ?? '—'}{unit && <span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>{unit}</span>}
      </div>
    </div>
  );
}

function healthColor(score) {
  if (score == null) return '#64748b';
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

export default function ShipOverviewPage() {
  const { data, loading } = useShipData();

  const ov = data?.overview;
  const hourly = data?.hourly || [];

  const recentTrend = useMemo(() => hourly.slice(-48).map((h) => ({
    time: h.hour_ts.slice(5, 16).replace('T', ' '),
    health: h.health_score,
    rpm: h.shaft_rpm,
    power: h.shaft_power_kw != null ? parseFloat((h.shaft_power_kw / 1000).toFixed(2)) : null,
  })), [hourly]);

  const healthGauge = useMemo(() => [
    { name: 'Health', value: ov?.latest_health_score ?? 0, fill: healthColor(ov?.latest_health_score) },
  ], [ov]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading Beijing Maersk data...</p></div>
    </div>
  );

  const hScore = ov?.latest_health_score;
  const hColor = healthColor(hScore);

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Ship Overview — Beijing Maersk</h1>
          <p className="page-description">IMO 9984572 · {ov?.data_period} · {ov?.total_hours} hourly records</p>
        </div>
      </div>

      {/* Health gauge + key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, marginBottom: 24 }}>
        <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Latest Health Score</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={225} endAngle={-45} data={healthGauge}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 42, fontWeight: 700, color: hColor, marginTop: -16 }}>{hScore ?? '—'}</div>
          <div style={{ fontSize: 13, color: hColor, marginTop: 4 }}>{hScore >= 75 ? 'Healthy' : hScore >= 55 ? 'Degraded' : 'Critical'}</div>
        </div>
        <div className="kpi-grid" style={{ gap: 12, alignContent: 'start' }}>
          <StatCard label="Avg Health (Apr)" value={ov?.avg_health_score} unit="%" />
          <StatCard label="Min Health" value={ov?.min_health_score} unit="%" color="#ef4444" />
          <StatCard label="Shaft RPM (latest)" value={ov?.latest_shaft_rpm} unit="rpm" />
          <StatCard label="Shaft Power (latest)" value={ov?.latest_power_kw ? (ov.latest_power_kw / 1000).toFixed(1) : null} unit="MW" />
          <StatCard label="SG Power (latest)" value={ov?.latest_sg_power_kw} unit="kW" />
          <StatCard label="Frequency (latest)" value={ov?.latest_frequency_hz} unit="Hz" />
          <StatCard label="Current (latest)" value={ov?.latest_current_a} unit="A" />
          <StatCard label="Running Hours" value={ov?.latest_running_hours ? Math.round(ov.latest_running_hours) : null} unit="h" />
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>⚠</div>
          <div className="kpi-title">Critical Alerts</div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>{ov?.critical_alerts}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>!</div>
          <div className="kpi-title">Warning Alerts</div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>{ov?.warning_alerts}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>⚡</div>
          <div className="kpi-title">Energy Generated</div>
          <div className="kpi-value">{ov?.latest_energy_kwh ? (ov.latest_energy_kwh / 1e6).toFixed(2) : '—'}<span style={{ fontSize: 14, marginLeft: 4, color: '#94a3b8' }}>GWh</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>📊</div>
          <div className="kpi-title">Total Hours (Apr)</div>
          <div className="kpi-value">{ov?.total_hours}</div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Health Score &amp; Shaft Power — Last 48 Hours</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={recentTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={7} />
            <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="health" stroke="#22c55e" strokeWidth={2} dot={false} name="Health Score (%)" />
            <Line yAxisId="right" type="monotone" dataKey="power" stroke="#3b82f6" strokeWidth={2} dot={false} name="Shaft Power (MW)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
