import React, { useMemo, useState } from 'react';
import { useShipData } from '../../hooks/useShipData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import './MonitoringPages.css';

const SEV_COLOR = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#3b82f6' };
const SEV_BG = { CRITICAL: 'rgba(239,68,68,0.1)', WARNING: 'rgba(245,158,11,0.1)', INFO: 'rgba(59,130,246,0.1)' };

function formatHour(ts) {
  if (!ts) return '';
  return ts.replace('T', ' ');
}

export default function AlertsEventsPage() {
  const { data, loading } = useShipData();
  const [filterSev, setFilterSev] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const alerts = useMemo(() => data?.allAlerts || [], [data]);

  const summary = useMemo(() => ({
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
    warning: alerts.filter((a) => a.severity === 'WARNING').length,
  }), [alerts]);

  const alertTypes = useMemo(() => ['ALL', ...new Set(alerts.map((a) => a.alert_type))], [alerts]);

  const filtered = useMemo(() => alerts.filter((a) => {
    if (filterSev !== 'ALL' && a.severity !== filterSev) return false;
    if (filterType !== 'ALL' && a.alert_type !== filterType) return false;
    return true;
  }).slice().reverse(), [alerts, filterSev, filterType]);

  const alertsByDay = useMemo(() => {
    const byDay = {};
    for (const a of alerts) {
      const day = (a.hour_ts || '').slice(0, 10);
      if (!byDay[day]) byDay[day] = { day, CRITICAL: 0, WARNING: 0 };
      byDay[day][a.severity] = (byDay[day][a.severity] || 0) + 1;
    }
    return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
  }, [alerts]);

  const alertsByMetric = useMemo(() => {
    const byM = {};
    for (const a of alerts) {
      byM[a.metric_name] = (byM[a.metric_name] || 0) + 1;
    }
    return Object.entries(byM).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [alerts]);

  if (loading) return (
    <div className="monitoring-page">
      <div className="loading-state"><div className="loading-spinner" /><p>Loading Beijing Maersk data...</p></div>
    </div>
  );

  return (
    <div className="monitoring-page">
      <div className="page-header">
        <div>
          <h1>Alerts &amp; Events Dashboard</h1>
          <p className="page-description">Beijing Maersk (IMO 9984572) — April 2026 · Computed from SGM sensor pipeline</p>
        </div>
        <div className="header-actions">
          <select
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '14px' }}
          >
            {alertTypes.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>⚑</div>
          <div className="kpi-title">Total Alerts</div>
          <div className="kpi-value">{summary.total.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: SEV_BG.CRITICAL, color: SEV_COLOR.CRITICAL }}>⚠</div>
          <div className="kpi-title">Critical</div>
          <div className="kpi-value" style={{ color: SEV_COLOR.CRITICAL }}>{summary.critical}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: SEV_BG.WARNING, color: SEV_COLOR.WARNING }}>!</div>
          <div className="kpi-title">Warning</div>
          <div className="kpi-value" style={{ color: SEV_COLOR.WARNING }}>{summary.warning}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>📅</div>
          <div className="kpi-title">Days with Alerts</div>
          <div className="kpi-value">{alertsByDay.filter((d) => d.CRITICAL + d.WARNING > 0).length}</div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Alerts per Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={alertsByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={1} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="CRITICAL" fill={SEV_COLOR.CRITICAL} name="Critical" isAnimationActive={false} />
            <Bar dataKey="WARNING" fill={SEV_COLOR.WARNING} name="Warning" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Top Alerted Metrics</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={alertsByMetric} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={220} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="count" fill="#3b82f6" name="Alert Count" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="events-table-container">
        <h3>Alert Event Log {filtered.length < alerts.length && `(${filtered.length} of ${alerts.length})`}</h3>
        <div className="table-wrapper" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="events-table">
            <thead>
              <tr>
                <th>Date / Hour</th>
                <th>Severity</th>
                <th>Type</th>
                <th>Metric</th>
                <th>Value</th>
                <th>Threshold</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No alerts match filters</td></tr>
              ) : filtered.slice(0, 200).map((a, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatHour(a.hour_ts)}</td>
                  <td>
                    <span className={`status-badge ${a.severity === 'CRITICAL' ? 'status-anomaly' : 'status-warning'}`} style={{ background: SEV_BG[a.severity], color: SEV_COLOR[a.severity] }}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{a.alert_type.replace(/_/g, ' ')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.metric_name}</td>
                  <td style={{ textAlign: 'right' }}>{typeof a.metric_value === 'number' ? a.metric_value.toFixed(2) : a.metric_value}</td>
                  <td style={{ textAlign: 'right' }}>{a.threshold_value}</td>
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
