import React, { useMemo } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

function scoreColor(s) {
  if (s == null) return '#64748b';
  if (s <= 3) return '#22c55e';
  if (s <= 8) return '#f59e0b';
  return '#ef4444';
}

export default function ComponentSummaryPage() {
  const { data, loading } = useShipData();
  const hourly = data?.hourly || [];
  const ov = data?.overview;

  const latest = hourly[hourly.length - 1];

  const penaltySummary = useMemo(() => {
    if (!latest) return [];
    return [
      { component: 'Mechanical', penalty: latest.mechanical_contrib, max: 25 },
      { component: 'Electrical', penalty: latest.electrical_contrib, max: 20 },
      { component: 'Thermal', penalty: latest.thermal_contrib, max: 20 },
      { component: 'Frequency', penalty: latest.frequency_contrib, max: 15 },
      { component: 'RPM Mismatch', penalty: latest.mismatch_contrib, max: 10 },
      { component: 'Loading', penalty: latest.loading_contrib, max: 10 },
    ];
  }, [latest]);

  const radarData = useMemo(() => {
    if (!latest) return [];
    return penaltySummary.map((p) => ({
      subject: p.component,
      score: parseFloat(((1 - p.penalty / p.max) * 100).toFixed(1)),
      fullMark: 100,
    }));
  }, [penaltySummary, latest]);

  const avgPenalties = useMemo(() => {
    if (!hourly.length) return [];
    const keys = ['mechanical_contrib', 'electrical_contrib', 'thermal_contrib', 'frequency_contrib', 'mismatch_contrib', 'loading_contrib'];
    const labels = ['Mechanical', 'Electrical', 'Thermal', 'Frequency', 'RPM Mismatch', 'Loading'];
    return keys.map((k, i) => {
      const vals = hourly.map((h) => h[k]).filter((v) => v != null);
      return {
        component: labels[i],
        avgPenalty: vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3)) : 0,
        maxPenalty: vals.length ? parseFloat(Math.max(...vals).toFixed(3)) : 0,
      };
    });
  }, [hourly]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading component data...</p></div>
    </div>
  );

  const hScore = ov?.latest_health_score;
  const hColor = hScore >= 75 ? '#22c55e' : hScore >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Component Summary</h1>
          <p className="page-description">Beijing Maersk — Health penalty breakdown by system component</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Overall Health Score</div>
          <div className="kpi-value" style={{ color: hColor }}>{hScore ?? '—'}%</div>
        </div>
        {penaltySummary.map((p) => (
          <div key={p.component} className="kpi-card">
            <div className="kpi-title">{p.component} Penalty</div>
            <div className="kpi-value" style={{ color: scoreColor(p.penalty), fontSize: 22 }}>
              {p.penalty?.toFixed(2) ?? '—'}
              <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>/ {p.max}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="chart-container">
          <h3>Latest Component Health Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Radar name="Health %" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-container">
          <h3>Average vs Max Penalty (April)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgPenalties}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="component" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="avgPenalty" fill="#3b82f6" name="Avg Penalty" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maxPenalty" fill="#ef4444" name="Max Penalty" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="events-table-container">
        <h3>Component Health Matrix — Latest Reading ({latest?.hour_ts || 'N/A'})</h3>
        <div className="table-wrapper">
          <table className="events-table">
            <thead>
              <tr><th>Component</th><th>Penalty Score</th><th>Max Allowed</th><th>Health %</th><th>Status</th></tr>
            </thead>
            <tbody>
              {penaltySummary.map((p) => {
                const health = ((1 - p.penalty / p.max) * 100).toFixed(1);
                const status = p.penalty <= p.max * 0.3 ? 'Healthy' : p.penalty <= p.max * 0.7 ? 'Degraded' : 'Critical';
                const sc = p.penalty <= p.max * 0.3 ? '#22c55e' : p.penalty <= p.max * 0.7 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={p.component}>
                    <td>{p.component}</td>
                    <td>{p.penalty?.toFixed(3) ?? '—'}</td>
                    <td>{p.max}</td>
                    <td>{health}%</td>
                    <td><span className="status-badge" style={{ background: `${sc}22`, color: sc }}>{status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
