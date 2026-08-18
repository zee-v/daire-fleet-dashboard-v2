import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BEIJING_MAERSK_COMPONENTS, getFleetComponents } from '../context/ComponentContext';
import { useShipData } from '../hooks/useShipData';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import './ThreePanelPage.css';

const METRIC_META = {
  shaft_rpm:               { label: 'Shaft RPM',       unit: 'rpm',  color: '#22c55e' },
  shaft_power_kw:          { label: 'Shaft Power',     unit: 'kW',   color: '#3b82f6' },
  shaft_torque_knm:        { label: 'Torque',          unit: 'kNm',  color: '#a855f7' },
  sg_actual_power_kw:      { label: 'SG Power',        unit: 'kW',   color: '#22c55e' },
  sg_actual_frequency_hz:  { label: 'Frequency',       unit: 'Hz',   color: '#3b82f6' },
  sg_actual_current_a:     { label: 'Current',         unit: 'A',    color: '#f59e0b' },
  sg_actual_voltage_v:     { label: 'Voltage',         unit: 'V',    color: '#a855f7' },
  sg_actual_speed_rpm:     { label: 'SG Speed',        unit: 'rpm',  color: '#06b6d4' },
  sg_available_power_pct:  { label: 'Available Power', unit: '%',    color: '#84cc16' },
  sg_winding_u1_temp:      { label: 'Winding U1',      unit: '°C',   color: '#ef4444' },
  sg_winding_v1_temp:      { label: 'Winding V1',      unit: '°C',   color: '#f97316' },
  sg_winding_w1_temp:      { label: 'Winding W1',      unit: '°C',   color: '#eab308' },
  sg_winding_u2_temp:      { label: 'Winding U2',      unit: '°C',   color: '#22c55e' },
  sg_winding_v2_temp:      { label: 'Winding V2',      unit: '°C',   color: '#06b6d4' },
  sg_winding_w2_temp:      { label: 'Winding W2',      unit: '°C',   color: '#8b5cf6' },
  sg_transformer_winding_1u_temp: { label: 'Trans 1U', unit: '°C',   color: '#ef4444' },
  sg_transformer_winding_1v_temp: { label: 'Trans 1V', unit: '°C',   color: '#f97316' },
  sg_transformer_winding_1w_temp: { label: 'Trans 1W', unit: '°C',   color: '#eab308' },
  sg_transformer_winding_2u_temp: { label: 'Trans 2U', unit: '°C',   color: '#22c55e' },
  sg_transformer_winding_2v_temp: { label: 'Trans 2V', unit: '°C',   color: '#06b6d4' },
  sg_transformer_winding_2w_temp: { label: 'Trans 2W', unit: '°C',   color: '#8b5cf6' },
  sg_reactor_winding_l1_1_temp: { label: 'Reactor L1.1', unit: '°C', color: '#ef4444' },
  sg_reactor_winding_l1_2_temp: { label: 'Reactor L1.2', unit: '°C', color: '#f97316' },
  sg_reactor_winding_l1_3_temp: { label: 'Reactor L1.3', unit: '°C', color: '#eab308' },
  sg_reactor_winding_l2_1_temp: { label: 'Reactor L2.1', unit: '°C', color: '#22c55e' },
  sg_reactor_winding_l2_2_temp: { label: 'Reactor L2.2', unit: '°C', color: '#06b6d4' },
  sg_reactor_winding_l2_3_temp: { label: 'Reactor L2.3', unit: '°C', color: '#8b5cf6' },
  sg_converter_coolant_temp: { label: 'Coolant Temp', unit: '°C',    color: '#38bdf8' },
  sg_air_temp_hot1:        { label: 'Air Hot 1',      unit: '°C',   color: '#f97316' },
  sg_air_temp_cold1:       { label: 'Air Cold 1',     unit: '°C',   color: '#06b6d4' },
  sg_air_temp_hot2:        { label: 'Air Hot 2',      unit: '°C',   color: '#ef4444' },
  sg_air_temp_cold2:       { label: 'Air Cold 2',     unit: '°C',   color: '#3b82f6' },
};

const CHART_GROUPS = {
  'main-engine': [
    { title: 'Shaft RPM vs SG Speed', metrics: ['shaft_rpm', 'sg_actual_speed_rpm'], refLines: [{ y: 30, label: 'Min 30rpm', color: '#f59e0b' }] },
    { title: 'Shaft Power & Torque', metrics: ['shaft_power_kw', 'shaft_torque_knm'], dual: true, refLines: [{ y: 35000, label: '35MW warn', color: '#f59e0b' }] },
  ],
  'shaft-generator': [
    { title: 'Generator Frequency', metrics: ['sg_actual_frequency_hz'], refLines: [{ y: 35, label: 'Low 35Hz', color: '#f59e0b' }, { y: 55, label: 'High 55Hz', color: '#f59e0b' }, { y: 58, label: 'Crit 58Hz', color: '#ef4444' }] },
    { title: 'SG Power & Current', metrics: ['sg_actual_power_kw', 'sg_actual_current_a'], dual: true, refLines: [{ y: 1800, label: 'Warn 1800A', color: '#f59e0b', axis: 'right' }] },
    { title: 'Voltage & Available Power', metrics: ['sg_actual_voltage_v', 'sg_available_power_pct'], dual: true },
  ],
  'generator-windings': [
    { title: 'Generator Windings U/V/W — Phase 1', metrics: ['sg_winding_u1_temp', 'sg_winding_v1_temp', 'sg_winding_w1_temp'], refLines: [{ y: 80, label: 'Warn 80°C', color: '#f59e0b' }] },
    { title: 'Generator Windings U/V/W — Phase 2', metrics: ['sg_winding_u2_temp', 'sg_winding_v2_temp', 'sg_winding_w2_temp'], refLines: [{ y: 80, label: 'Warn 80°C', color: '#f59e0b' }] },
  ],
  'transformer': [
    { title: 'Transformer Windings — Set 1', metrics: ['sg_transformer_winding_1u_temp', 'sg_transformer_winding_1v_temp', 'sg_transformer_winding_1w_temp'], refLines: [{ y: 80, label: 'Warn 80°C', color: '#f59e0b' }] },
    { title: 'Transformer Windings — Set 2', metrics: ['sg_transformer_winding_2u_temp', 'sg_transformer_winding_2v_temp', 'sg_transformer_winding_2w_temp'], refLines: [{ y: 80, label: 'Warn 80°C', color: '#f59e0b' }] },
  ],
  'reactor': [
    { title: 'Reactor Windings L1', metrics: ['sg_reactor_winding_l1_1_temp', 'sg_reactor_winding_l1_2_temp', 'sg_reactor_winding_l1_3_temp'], refLines: [{ y: 85, label: 'Warn 85°C', color: '#f59e0b' }] },
    { title: 'Reactor Windings L2', metrics: ['sg_reactor_winding_l2_1_temp', 'sg_reactor_winding_l2_2_temp', 'sg_reactor_winding_l2_3_temp'], refLines: [{ y: 85, label: 'Warn 85°C', color: '#f59e0b' }] },
  ],
  'cooling': [
    { title: 'Coolant Temperature', metrics: ['sg_converter_coolant_temp'], refLines: [{ y: 55, label: 'Warn 55°C', color: '#f59e0b' }, { y: 70, label: 'Crit 70°C', color: '#ef4444' }] },
    { title: 'Air Temperatures', metrics: ['sg_air_temp_hot1', 'sg_air_temp_cold1', 'sg_air_temp_hot2', 'sg_air_temp_cold2'] },
  ],
};

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: 12, color: 'var(--text-primary)' };

export default function LivePerformancePage() {
  const { fleetId = 'beijing-maersk', componentId = 'main-engine' } = useParams();
  const isLiveFleet = fleetId === 'beijing-maersk';
  const fleetComponents = getFleetComponents(fleetId);
  const selectedComponent = fleetComponents.find((c) => c.id === componentId) || fleetComponents[0];
  const { data, loading } = useShipData();

  const hourly = data?.hourly || [];
  const ov = data?.overview;
  const latest = hourly[hourly.length - 1];

  const chartData = useMemo(() => hourly.map((h) => ({
    time: h.hour_ts.slice(5, 13).replace('T', ' '),
    ...h,
  })), [hourly]);

  const groups = CHART_GROUPS[selectedComponent?.id] || [];

  // Latest readings for selected component
  const latestReadings = useMemo(() => {
    if (!latest || !selectedComponent) return [];
    return selectedComponent.metrics
      .filter((m) => METRIC_META[m])
      .map((m) => ({ key: m, meta: METRIC_META[m], value: latest[m] }))
      .filter((r) => r.value != null);
  }, [latest, selectedComponent]);

  // Energy & efficiency right-panel stats
  const energyStats = useMemo(() => {
    if (!hourly.length) return {};
    const powers = hourly.map((h) => h.sg_actual_power_kw).filter(Boolean);
    const avail = hourly.map((h) => h.sg_available_power_pct).filter(Boolean);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      cumEnergy: ov?.latest_energy_kwh ? (ov.latest_energy_kwh / 1e6).toFixed(2) : '—',
      avgPower: powers.length ? Math.round(avg(powers)) : '—',
      maxPower: powers.length ? Math.round(Math.max(...powers)) : '—',
      avgAvail: avail.length ? avg(avail).toFixed(1) : '—',
      loadingPct: latest?.sg_actual_power_kw && latest?.sg_available_power_pct
        ? ((latest.sg_actual_power_kw / (latest.sg_available_power_pct / 100 * 2500)) * 100).toFixed(1)
        : '—',
      frequency: latest?.sg_actual_frequency_hz?.toFixed(2) ?? '—',
      voltage: latest?.sg_actual_voltage_v?.toFixed(0) ?? '—',
      current: latest?.sg_actual_current_a?.toFixed(0) ?? '—',
      shaftPower: latest?.shaft_power_kw ? (latest.shaft_power_kw / 1000).toFixed(1) : '—',
      shaftRpm: latest?.shaft_rpm?.toFixed(1) ?? '—',
    };
  }, [hourly, ov, latest]);

  if (!isLiveFleet) return (
    <div className="tpp-no-data">
      <div className="tpp-no-data-icon">◉</div>
      <div className="tpp-no-data-title">Live data not available</div>
      <div className="tpp-no-data-sub">Live sensor data is not yet available for this fleet. Select Fleet Asia-Europe to view real-time performance.</div>
    </div>
  );

  if (loading) return (
    <div className="tpp-loading"><div className="tpp-spinner" /><p>Loading data…</p></div>
  );

  return (
    <div className="tpp-body">
      {/* ── MIDDLE PANEL ── */}
      <div className="tpp-middle">
        <div className="tpp-middle-header">
          <div>
            <div className="tpp-middle-title">{selectedComponent?.name}</div>
            <div className="tpp-middle-sub">Live sensor readings · April 2026 · 552 hourly records</div>
          </div>
        </div>

        <div className="tpp-charts">
          {groups.map((g, gi) => (
            <div key={gi} className="tpp-chart-card">
              <div className="tpp-chart-title">{g.title}</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} interval={47} />
                  <YAxis yAxisId="left" stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  {g.dual && <YAxis yAxisId="right" orientation="right" stroke="var(--border-primary)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />}
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-tertiary)' }} />
                  {(g.refLines || []).map((r, ri) => (
                    <ReferenceLine key={ri} yAxisId={r.axis || 'left'} y={r.y} stroke={r.color} strokeDasharray="4 4"
                      label={{ value: r.label, fill: r.color, fontSize: 9, position: 'insideTopRight' }} />
                  ))}
                  {g.metrics.map((m, mi) => {
                    const meta = METRIC_META[m] || { label: m, color: '#64748b' };
                    const yid = g.dual && mi > 0 ? 'right' : 'left';
                    return (
                      <Line key={m} yAxisId={yid} type="monotone" dataKey={m} stroke={meta.color}
                        strokeWidth={1.5} dot={false} name={meta.label} isAnimationActive={false} />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside className="tpp-right">
        <div className="tpp-right-section">
          <div className="tpp-right-title">Energy Performance</div>
          <div className="tpp-stat-list">
            <div className="tpp-stat"><span>Cumulative Energy</span><strong>{energyStats.cumEnergy} GWh</strong></div>
            <div className="tpp-stat"><span>Avg SG Power</span><strong>{energyStats.avgPower} kW</strong></div>
            <div className="tpp-stat"><span>Peak SG Power</span><strong>{energyStats.maxPower} kW</strong></div>
            <div className="tpp-stat"><span>Avg Available Power</span><strong>{energyStats.avgAvail}%</strong></div>
          </div>
        </div>

        <div className="tpp-right-section">
          <div className="tpp-right-title">Fuel & Load Performance</div>
          <div className="tpp-stat-list">
            <div className="tpp-stat"><span>Loading Ratio (latest)</span><strong>{energyStats.loadingPct}%</strong></div>
            <div className="tpp-stat"><span>Shaft Power (latest)</span><strong>{energyStats.shaftPower} MW</strong></div>
            <div className="tpp-stat"><span>Shaft RPM (latest)</span><strong>{energyStats.shaftRpm} rpm</strong></div>
            <div className="tpp-stat"><span>Running Hours</span><strong>{ov?.latest_running_hours ? Math.round(ov.latest_running_hours).toLocaleString() : '—'} h</strong></div>
          </div>
        </div>

        <div className="tpp-right-section">
          <div className="tpp-right-title">Electrical Performance</div>
          <div className="tpp-stat-list">
            <div className="tpp-stat"><span>Frequency (latest)</span><strong>{energyStats.frequency} Hz</strong></div>
            <div className="tpp-stat"><span>Voltage (latest)</span><strong>{energyStats.voltage} V</strong></div>
            <div className="tpp-stat"><span>Current (latest)</span><strong>{energyStats.current} A</strong></div>
          </div>
        </div>

        <div className="tpp-right-section">
          <div className="tpp-right-title">Live Readings — {selectedComponent?.name}</div>
          <div className="tpp-readings">
            {latestReadings.map((r) => (
              <div key={r.key} className="tpp-reading-row">
                <div className="tpp-reading-dot" style={{ background: r.meta.color }} />
                <div className="tpp-reading-label">{r.meta.label}</div>
                <div className="tpp-reading-val">
                  {r.value?.toFixed(1)} <span className="tpp-reading-unit">{r.meta.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

