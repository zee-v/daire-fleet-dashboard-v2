import React, { useMemo } from 'react';
import { getFleetComponents } from '../context/ComponentContext';
import { useShipData } from '../hooks/useShipData';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import './ThreePanelPage.css';

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: 12, color: 'var(--text-primary)' };

const PENALTY_META = {
  mechanical_contrib: { label: 'Mechanical', color: '#3b82f6', max: 25 },
  electrical_contrib: { label: 'Electrical',  color: '#a855f7', max: 20 },
  thermal_contrib:    { label: 'Thermal',     color: '#ef4444', max: 20 },
  frequency_contrib:  { label: 'Frequency',   color: '#f59e0b', max: 15 },
  mismatch_contrib:   { label: 'Mismatch',    color: '#06b6d4', max: 10 },
  loading_contrib:    { label: 'Loading',     color: '#84cc16', max: 10 },
};

const COMP_PENALTY = {
  'main-engine':        ['mechanical_contrib'],
  'shaft-generator':    ['electrical_contrib', 'mismatch_contrib', 'loading_contrib'],
  'generator-windings': ['thermal_contrib'],
  'transformer':        ['thermal_contrib'],
  'reactor':            ['thermal_contrib'],
  'cooling':            ['thermal_contrib', 'frequency_contrib'],
};

function RISK_LABEL(score) {
  if (score == null) return { label: 'Unknown', color: '#64748b' };
  if (score >= 75)   return { label: 'Low Risk', color: '#22c55e' };
  if (score >= 55)   return { label: 'Moderate Risk', color: '#f59e0b' };
  return { label: 'High Risk', color: '#ef4444' };
}

// Maintenance recommendation logic based on component + penalties
function getRecommendations(comp, latest, alerts) {
  const recs = [];
  if (!comp || !latest) return recs;

  const thermal = latest.thermal_contrib ?? 0;
  const mech = latest.mechanical_contrib ?? 0;
  const elec = latest.electrical_contrib ?? 0;
  const freq = latest.frequency_contrib ?? 0;
  const mismatch = latest.mismatch_contrib ?? 0;

  const compAlerts = (alerts || []).filter((a) =>
    a.category?.toLowerCase().includes(comp.unit?.toLowerCase()) ||
    a.category?.toLowerCase().includes(comp.id.split('-')[0])
  );
  const critAlerts = compAlerts.filter((a) => a.severity === 'critical').length;
  const warnAlerts = compAlerts.filter((a) => a.severity === 'warning').length;

  if (comp.id === 'main-engine') {
    if (mech > 15) recs.push({ priority: 'critical', action: 'Inspect shaft coupling and bearings', detail: `Mechanical penalty at ${mech.toFixed(1)} — exceeds 60% threshold. Schedule dry-dock inspection.`, horizon: '< 7 days' });
    else if (mech > 8) recs.push({ priority: 'warning', action: 'Schedule shaft alignment check', detail: `Mechanical degradation at ${mech.toFixed(1)}. Monitor vibration patterns.`, horizon: '< 30 days' });
    if (mismatch > 6) recs.push({ priority: 'warning', action: 'Review load distribution', detail: 'Power mismatch detected between main engine output and SG load.', horizon: '< 14 days' });
    recs.push({ priority: 'info', action: 'Continue condition monitoring', detail: 'Maintain hourly telemetry review. No immediate intervention required.', horizon: 'Ongoing' });
  }
  if (comp.id === 'shaft-generator') {
    if (elec > 12) recs.push({ priority: 'critical', action: 'Inspect SG electrical connections', detail: `Electrical penalty at ${elec.toFixed(1)}. Risk of insulation failure.`, horizon: '< 7 days' });
    if (freq > 8) recs.push({ priority: 'warning', action: 'Calibrate frequency regulators', detail: `Frequency excursions contributing ${freq.toFixed(1)} penalty points.`, horizon: '< 14 days' });
    if (mismatch > 5) recs.push({ priority: 'warning', action: 'Balance SG load sharing', detail: 'Active power mismatch detected, review load sharing algorithms.', horizon: '< 14 days' });
    recs.push({ priority: 'info', action: 'Log generator performance metrics', detail: 'Continue tracking voltage and current waveforms for trend analysis.', horizon: 'Ongoing' });
  }
  if (['generator-windings', 'transformer', 'reactor'].includes(comp.id)) {
    if (thermal > 14) recs.push({ priority: 'critical', action: `Inspect ${comp.name} — overtemperature`, detail: `Thermal penalty at ${thermal.toFixed(1)}. Winding temperatures approaching limits.`, horizon: '< 3 days' });
    else if (thermal > 8) recs.push({ priority: 'warning', action: `Clean ${comp.name} cooling paths`, detail: `Thermal degradation at ${thermal.toFixed(1)}. Verify airflow and insulation.`, horizon: '< 21 days' });
    if (critAlerts > 0) recs.push({ priority: 'critical', action: 'Address active critical thermal alerts', detail: `${critAlerts} critical thermal alert(s) logged this period.`, horizon: 'Immediate' });
    recs.push({ priority: 'info', action: 'Continue thermal monitoring', detail: 'Review winding temperature trend at each port call.', horizon: 'Ongoing' });
  }
  if (comp.id === 'cooling') {
    if (thermal > 10) recs.push({ priority: 'warning', action: 'Service cooling system — coolant check', detail: `Coolant temperature elevated. Thermal penalty at ${thermal.toFixed(1)}.`, horizon: '< 14 days' });
    if (freq > 7) recs.push({ priority: 'warning', action: 'Inspect cooling fan drive frequency', detail: 'Frequency irregularities may affect cooling fan performance.', horizon: '< 21 days' });
    recs.push({ priority: 'info', action: 'Monitor air temperature differentials', detail: 'Track hot/cold air delta across converter to baseline performance.', horizon: 'Ongoing' });
  }

  return recs.slice(0, 5);
}

export default function AssetHealthPage() {
  const isLiveFleet = true; // Asset Health is always Beijing Maersk for now
  const fleetComponents = getFleetComponents('beijing-maersk');
  const selectedComponent = fleetComponents[0];
  const { data, loading } = useShipData();

  const hourly = data?.hourly || [];
  const ov = data?.overview;
  const latest = hourly[hourly.length - 1];
  const allAlerts = data?.allAlerts || [];

  // Subsample for trend chart
  const trendData = useMemo(() => {
    const step = Math.ceil(hourly.length / 120);
    return hourly.filter((_, i) => i % step === 0).map((h) => ({
      time: h.hour_ts.slice(5, 13).replace('T', ' '),
      health: h.health_score,
      ...Object.fromEntries(Object.keys(PENALTY_META).map((k) => [k, h[k] ?? 0])),
    }));
  }, [hourly]);

  // Penalties relevant to selected component
  const relevantPenalties = useMemo(() => {
    if (!selectedComponent || !latest) return [];
    const keys = COMP_PENALTY[selectedComponent.id] || Object.keys(PENALTY_META);
    return keys.map((k) => ({
      key: k,
      ...PENALTY_META[k],
      current: latest[k] ?? 0,
    }));
  }, [selectedComponent, latest]);

  // Impending failure causes
  const failureCauses = useMemo(() => {
    if (!latest) return [];
    return Object.entries(PENALTY_META)
      .map(([k, m]) => ({ key: k, ...m, current: latest[k] ?? 0, pct: ((latest[k] ?? 0) / m.max) * 100 }))
      .filter((c) => c.current > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [latest]);

  const recs = useMemo(() =>
    getRecommendations(selectedComponent, latest, allAlerts),
    [selectedComponent, latest, allAlerts]
  );

  const hScore = ov?.latest_health_score;
  const risk = RISK_LABEL(hScore);

  // Recent high-severity alerts for right panel
  const recentAlerts = useMemo(() => {
    return allAlerts
      .filter((a) => a.severity === 'critical' || a.severity === 'warning')
      .slice(-8)
      .reverse();
  }, [allAlerts]);

  if (loading) return (
    <div className="tpp-loading"><div className="tpp-spinner" /><p>Loading health analytics…</p></div>
  );

  return (
    <div className="tpp-body">
      {/* ── MIDDLE PANEL ── */}
      <div className="tpp-middle">
        <div className="tpp-middle-header">
          <div>
            <div className="tpp-middle-title">{selectedComponent?.name} — Health Analysis</div>
            <div className="tpp-middle-sub">Flink penalty engine · April 2026 · {hourly.length} records</div>
          </div>
          <div className="tpp-risk-badge" style={{ borderColor: risk.color, color: risk.color }}>
            {risk.label}
          </div>
        </div>

        {/* Overall health score trend */}
        <div className="tpp-chart-card">
          <div className="tpp-chart-title">Fleet Health Score — 30-day trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="time" stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval={23} />
              <YAxis domain={[0, 100]} stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine yAxisId={0} y={75} stroke="#22c55e" strokeDasharray="4 4"
                label={{ value: 'Healthy 75', fill: '#22c55e', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine yAxisId={0} y={55} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: 'Degraded 55', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="health" stroke="#3b82f6" strokeWidth={2} dot={false}
                name="Health Score" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Component penalty contribution chart */}
        <div className="tpp-chart-card">
          <div className="tpp-chart-title">Penalty Contributions — {selectedComponent?.name}</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="time" stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval={23} />
              <YAxis stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {relevantPenalties.map((p) => (
                <Bar key={p.key} dataKey={p.key} fill={p.color} name={p.label}
                  isAnimationActive={false} opacity={0.85} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Current penalty breakdown table */}
        <div className="tpp-chart-card">
          <div className="tpp-chart-title">Current Penalty Detail (latest hour)</div>
          <div className="tpp-penalty-table">
            {failureCauses.map((c) => (
              <div key={c.key} className="tpp-penalty-row">
                <div className="tpp-penalty-name">
                  <span className="tpp-penalty-dot" style={{ background: c.color }} />
                  {c.label}
                </div>
                <div className="tpp-penalty-bar-wrap">
                  <div className="tpp-penalty-bar" style={{ width: `${Math.min(100, c.pct)}%`, background: c.color }} />
                </div>
                <div className="tpp-penalty-nums">
                  <span style={{ color: c.color }}>{c.current.toFixed(1)}</span>
                  <span className="tpp-penalty-max">/ {c.max}</span>
                </div>
                <div className="tpp-penalty-pct" style={{ color: c.pct > 60 ? '#ef4444' : c.pct > 30 ? '#f59e0b' : '#64748b' }}>
                  {c.pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside className="tpp-right">
        <div className="tpp-right-section">
          <div className="tpp-right-title">Causes of Impending Failure</div>
          <div className="tpp-cause-list">
            {failureCauses.slice(0, 4).map((c, i) => (
              <div key={c.key} className="tpp-cause-row">
                <div className="tpp-cause-rank" style={{ color: c.color }}>#{i + 1}</div>
                <div className="tpp-cause-body">
                  <div className="tpp-cause-name">{c.label}</div>
                  <div className="tpp-cause-detail">{c.current.toFixed(1)} / {c.max} pts · {c.pct.toFixed(0)}% utilised</div>
                </div>
                <div className="tpp-cause-sev"
                  style={{ color: c.pct > 60 ? '#ef4444' : c.pct > 30 ? '#f59e0b' : '#22c55e' }}>
                  {c.pct > 60 ? 'HIGH' : c.pct > 30 ? 'MED' : 'LOW'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tpp-right-section">
          <div className="tpp-right-title">Maintenance Planning</div>
          <div className="tpp-rec-list">
            {recs.map((r, i) => (
              <div key={i} className="tpp-rec-row">
                <div className="tpp-rec-badge" style={{
                  background: r.priority === 'critical' ? '#7f1d1d' : r.priority === 'warning' ? '#78350f' : '#1e3a5f',
                  color: r.priority === 'critical' ? '#fca5a5' : r.priority === 'warning' ? '#fcd34d' : '#93c5fd',
                }}>
                  {r.priority.toUpperCase()}
                </div>
                <div className="tpp-rec-body">
                  <div className="tpp-rec-action">{r.action}</div>
                  <div className="tpp-rec-detail">{r.detail}</div>
                  <div className="tpp-rec-horizon">Target: {r.horizon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tpp-right-section">
          <div className="tpp-right-title">Recent Alerts</div>
          <div className="tpp-alert-list">
            {recentAlerts.length === 0 && <div className="tpp-no-alerts">No recent alerts</div>}
            {recentAlerts.map((a, i) => (
              <div key={i} className="tpp-alert-row">
                <span className="tpp-alert-sev" style={{
                  color: a.severity === 'critical' ? '#ef4444' : '#f59e0b',
                }}>
                  {a.severity === 'critical' ? '●' : '◐'}
                </span>
                <div className="tpp-alert-body">
                  <div className="tpp-alert-msg">{a.message || a.alert_type}</div>
                  <div className="tpp-alert-time">{a.hour_ts?.slice(5, 16).replace('T', ' ') ?? ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
