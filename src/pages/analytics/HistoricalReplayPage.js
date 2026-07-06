import React, { useMemo, useState } from 'react';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import '../monitoring/MonitoringPages.css';

export default function HistoricalReplayPage() {
  const { data, loading, lastUpdated } = useRealtimeData('/api/edp/dashboard', 60000);
  const [selectedVessel, setSelectedVessel] = useState('all');

  const vessels = useMemo(() => {
    if (!data?.byVessel) return [];
    return Object.keys(data.byVessel);
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data) return [];
    if (selectedVessel === 'all') {
      return (data.fleetTimeline || []).map((p) => ({
        label: p.label.split('·')[0].trim(),
        health: p.value,
        anomaly: p.value < 55 ? p.value : null,
      }));
    }
    const vessel = data.byVessel?.[selectedVessel];
    if (!vessel) return [];
    return vessel.healthTrend.map((p) => ({
      label: p.label.split('·')[0].trim(),
      health: p.value,
      anomaly: p.value < 55 ? p.value : null,
    }));
  }, [data, selectedVessel]);

  const alertTimeline = useMemo(() => {
    if (!data?.fleetAlertDetails) return [];
    const filtered = selectedVessel === 'all'
      ? data.fleetAlertDetails
      : data.fleetAlertDetails.filter((a) => a.tail === selectedVessel);
    return filtered.slice(0, 20);
  }, [data, selectedVessel]);

  const stats = useMemo(() => {
    if (!timelineData.length) return { min: 0, max: 0, avg: 0, anomalies: 0 };
    const values = timelineData.map((d) => d.health);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      anomalies: timelineData.filter((d) => d.anomaly !== null).length,
    };
  }, [timelineData]);

  if (loading) return <div className="monitoring-page"><div className="loading-state"><div className="loading-spinner" /><p>Loading...</p></div></div>;

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Historical Replay</h1>
          <p className="page-description">Replay historical fleet health and anomaly timelines</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedVessel}
            onChange={(e) => setSelectedVessel(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}
          >
            <option value="all">All Vessels</option>
            {vessels.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <div className="last-updated">Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>↑</div>
          <div className="kpi-title">Peak Health</div>
          <div className="kpi-value">{stats.max}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>~</div>
          <div className="kpi-title">Avg Health</div>
          <div className="kpi-value">{stats.avg}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>↓</div>
          <div className="kpi-title">Lowest Health</div>
          <div className="kpi-value">{stats.min}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>⚠</div>
          <div className="kpi-title">Anomaly Events</div>
          <div className="kpi-value">{stats.anomalies}</div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Health Score Timeline — {selectedVessel === 'all' ? 'All Vessels' : selectedVessel}</h3>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Alert threshold', fill: '#f59e0b', fontSize: 11 }} />
            <Area type="monotone" dataKey="health" stroke="#3b82f6" fill="url(#healthGrad)" name="Health Score" />
            <Line type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={0} dot={{ r: 5, fill: '#ef4444' }} name="Anomaly" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="events-table-container">
        <h3>Alert Event Log</h3>
        <div className="table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Vessel</th>
                <th>Root Cause</th>
                <th>Component</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {alertTimeline.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No alert events in selection</td></tr>
              ) : alertTimeline.map((a, i) => (
                <tr key={i}>
                  <td>{a.dateTime}</td>
                  <td><span className="vessel-badge">{a.tail}</span></td>
                  <td>{a.rootCause}</td>
                  <td>{a.rcComponent}</td>
                  <td>
                    <span className={`status-badge ${a.active ? 'status-anomaly' : 'status-normal'}`}>
                      {a.active ? 'Active' : 'Resolved'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
