import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine, ReferenceDot,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { usePortfolio } from '../context/PortfolioContext';
import { HEALTH_THRESHOLDS, STATUS_RANK, recommendationFor, formatDate } from '../data/portfolio';
import './AssetMaintenancePage.css';

const STATUS_COLOR = { healthy: 'var(--status-healthy)', warning: 'var(--status-warning)', critical: 'var(--status-critical)', nodata: 'var(--text-muted)' };
const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 };
const PARAM_COLORS = ['var(--accent-blue-light)', 'var(--status-warning)', '#a78bfa'];
const tickDate = (ms) => formatDate(ms, { day: '2-digit', month: 'short' });
const fmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : Number(Number(v).toFixed(2)));
const byPriority = (a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.health - b.health;

export default function AssetMaintenancePage() {
  const { portfolio, loading, schedule, setSchedule } = usePortfolio();
  const [params, setParams] = useSearchParams();
  const [paramId, setParamId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [compareId, setCompareId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState('');

  const closePlot = () => { setParamId(null); setCompareId(''); setShowAll(false); };

  useEffect(() => {
    if (!paramId && !showAll && !modalOpen) return undefined;
    const scroller = document.querySelector('.page-content');
    const prevOverflow = scroller ? scroller.style.overflow : '';
    if (scroller) scroller.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') { setParamId(null); setCompareId(''); setShowAll(false); setModalOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => {
      if (scroller) scroller.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [paramId, showAll, modalOpen]);

  const sel = useMemo(() => {
    if (!portfolio) return null;
    const { fleets } = portfolio;
    let fleet = fleets.find((f) => f.id === params.get('fleet')) || null;
    let vessel = fleet?.vessels.find((v) => v.id === params.get('vessel')) || null;
    if (!vessel) {
      vessel = fleet ? [...fleet.vessels].sort(byPriority)[0] : [...fleets.flatMap((f) => f.vessels)].sort(byPriority)[0];
      fleet = fleets.find((f) => f.id === vessel.fleetId);
    }
    const system = vessel.systems.find((s) => s.id === params.get('system'))
      || vessel.systems.find((s) => s.id === vessel.worstSystemId)
      || vessel.systems[0];
    return { fleets, fleet, vessel, system };
  }, [portfolio, params]);

  if (loading || !sel) {
    return <div className="am-page"><PageHeader title="Asset Maintenance Requirements" subtitle="Loading fleet data…" /></div>;
  }

  const { fleets, fleet, vessel, system } = sel;
  const anchorMs = portfolio.anchorMs;
  const connected = system.connected !== false;
  const topParams = system.parameters.slice(0, 3);
  const selectedParam = connected ? system.parameters.find((p) => p.id === paramId) : null;
  const compareParam = selectedParam ? system.parameters.find((p) => p.id === compareId && p.id !== selectedParam.id) : null;

  const setSelection = (next) => {
    setParamId(null);
    setCompareId('');
    setShowAll(false);
    setParams(next);
  };
  const onFleet = (id) => {
    const f = fleets.find((x) => x.id === id);
    const v = [...f.vessels].sort(byPriority)[0];
    setSelection({ fleet: f.id, vessel: v.id, system: v.worstSystemId });
  };
  const onVessel = (id) => {
    const v = fleet.vessels.find((x) => x.id === id);
    setSelection({ fleet: fleet.id, vessel: v.id, system: v.worstSystemId });
  };
  const onSystem = (id) => setSelection({ fleet: fleet.id, vessel: vessel.id, system: id });

  const rec = recommendationFor(vessel, system, anchorMs);
  const scheduleKey = `${vessel.id}:${system.id}`;
  const scheduledMs = schedule[scheduleKey] ?? (system.id === vessel.worstSystemId ? vessel.defaultSchedule : null);
  const actionable = connected && system.status !== 'healthy';
  const priorityKey = actionable ? rec.priority.toLowerCase() : 'low';

  const openModal = () => {
    const base = scheduledMs || rec.dueBy || anchorMs + rec.withinDays * 86400000;
    setDateDraft(new Date(base).toISOString().slice(0, 10));
    setModalOpen(true);
  };
  const confirmSchedule = () => {
    if (dateDraft) setSchedule(scheduleKey, Date.parse(`${dateDraft}T12:00:00Z`));
    setModalOpen(false);
  };

  const trend = system.trend;
  const shortData = trend.length < portfolio.trendDays;

  return (
    <div className="am-page">
      <PageHeader title="Asset Maintenance Requirements" subtitle={`${fleet.name} › ${vessel.name} › ${system.name}`} />

      <div className="am-body">
        <section className="am-card am-select">
          <div className="am-select-fields">
            <label className="am-field">
              <span>Fleet</span>
              <select value={fleet.id} onChange={(e) => onFleet(e.target.value)}>
                {fleets.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <span className="am-sep" aria-hidden="true">›</span>
            <label className="am-field">
              <span>Vessel</span>
              <select value={vessel.id} onChange={(e) => onVessel(e.target.value)}>
                {fleet.vessels.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <span className="am-sep" aria-hidden="true">›</span>
            <label className="am-field">
              <span>System</span>
              <select value={system.id} onChange={(e) => onSystem(e.target.value)}>
                {vessel.systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <div className="am-current">
            <div className="am-current-label">Current status</div>
            <div className="am-current-row">
              <StatusBadge status={system.status} size="lg" />
              <div className="am-current-health">
                <strong>{connected ? `${system.health}%` : '—'}</strong>
                <span>system health</span>
              </div>
            </div>
          </div>
        </section>

        <div className="am-grid">
          <section className="am-card">
            <div className="am-card-head">
              <div>
                <h2 className="am-card-title">30-day health trend</h2>
                <p className="am-card-sub">{vessel.name} · {system.name}{connected && shortData ? ` · ${trend.length} days of connected data` : ''}</p>
              </div>
            </div>
            {connected ? (
              <div className="am-chart am-chart--trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                    <ReferenceArea y1={HEALTH_THRESHOLDS.healthy} y2={100} fill="var(--status-healthy)" fillOpacity={0.09}
                      label={{ value: 'Healthy', position: 'insideBottomLeft', fill: 'var(--status-healthy)', fontSize: 12, fontWeight: 600 }} />
                    <ReferenceArea y1={HEALTH_THRESHOLDS.warning} y2={HEALTH_THRESHOLDS.healthy} fill="var(--status-warning)" fillOpacity={0.1}
                      label={{ value: 'Warning', position: 'insideBottomLeft', fill: 'var(--status-warning)', fontSize: 12, fontWeight: 600 }} />
                    <ReferenceArea y1={0} y2={HEALTH_THRESHOLDS.warning} fill="var(--status-critical)" fillOpacity={0.09}
                      label={{ value: 'Critical', position: 'insideBottomLeft', fill: 'var(--status-critical)', fontSize: 12, fontWeight: 600 }} />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" minTickGap={40} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" width={46} />
                    <Tooltip labelFormatter={(v) => formatDate(v)} formatter={(v) => [`${v}%`, 'Health']} contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="value" stroke="var(--accent-blue-light)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    <ReferenceDot x={trend[trend.length - 1].t} y={trend[trend.length - 1].value} r={6} fill={STATUS_COLOR[system.status]} stroke="var(--bg-card)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="am-nodata">
                <div className="am-nodata-icon" aria-hidden="true">∅</div>
                <h3>Health data unavailable</h3>
                <p>No connected data is available for {vessel.name} · {system.name}.</p>
              </div>
            )}
          </section>

          <section className="am-card">
            <div className="am-card-head">
              <div>
                <h2 className="am-card-title">Contributing systems</h2>
                <p className="am-card-sub">Share of {vessel.name}'s health loss</p>
              </div>
            </div>
            <ol className="am-rank">
              {vessel.systems.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className={`am-rank-row${s.id === system.id ? ' am-rank-row--on' : ''}`} onClick={() => onSystem(s.id)}>
                    <span className="am-rank-num">{i + 1}</span>
                    <span className="am-rank-main">
                      <span className="am-rank-name">{s.name}</span>
                      <span className="am-rank-bar"><span style={{ width: `${s.contribution}%`, background: STATUS_COLOR[s.status] }} /></span>
                    </span>
                    <span className="am-rank-side">
                      {s.connected === false ? <StatusBadge status="nodata" /> : <><strong>{s.contribution}%</strong><StatusBadge status={s.status} /></>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="am-grid">
          <section className="am-card">
            <div className="am-card-head">
              <div>
                <h2 className="am-card-title">Top contributing parameters</h2>
                <p className="am-card-sub">{system.name} · ranked by deviation from normal baseline · click one to open its plot</p>
              </div>
              {connected && topParams.length > 1 && (
                <button type="button" className="am-btn am-btn--secondary am-btn--sm" onClick={() => { setParamId(null); setShowAll(true); }}>
                  Show top {topParams.length} together
                </button>
              )}
            </div>
            {connected && topParams.length > 0 ? (
              <ul className="am-params">
                {topParams.map((p, i) => (
                  <li key={p.id}>
                    <button type="button" className={`am-param${selectedParam?.id === p.id ? ' am-param--on' : ''}`} onClick={() => { setParamId(p.id); setCompareId(''); }}>
                      <span className="am-rank-num">{i + 1}</span>
                      <span className="am-param-main">
                        <span className="am-param-name">{p.name}</span>
                        <span className="am-param-meta">Baseline {fmt(p.baseline)} {p.unit} · {p.contribution}% of deviation</span>
                      </span>
                      <span className="am-param-val">
                        <strong>{fmt(p.current)} <small>{p.unit}</small></strong>
                        <span style={{ color: STATUS_COLOR[p.status] }}>{p.current >= p.baseline ? '+' : '−'}{p.deviation}% vs baseline</span>
                      </span>
                      <StatusBadge status={p.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="am-empty">Parameter data unavailable for this system.</p>
            )}
          </section>

          <section className={`am-card am-plan am-plan--${priorityKey}`}>
            <div className="am-card-head">
              <h2 className="am-card-title">Maintenance planning</h2>
            </div>
            {!connected ? (
              <p className="am-empty">A maintenance recommendation is not available until data is connected for this system.</p>
            ) : (
              <>
                <div className="am-plan-top">
                  <span className={`am-priority am-priority--${priorityKey}`}>{actionable ? rec.priority : 'Low'} priority</span>
                  <span className="am-plan-when">
                    {actionable ? <>Maintenance recommended <strong>within {rec.withinDays} days</strong></> : <>Routine inspection within <strong>{rec.withinDays} days</strong></>}
                  </span>
                </div>
                <p className="am-plan-action">{rec.action}</p>
                <dl className="am-plan-facts">
                  <div><dt>Affected asset</dt><dd>{vessel.name} · {system.name}</dd></div>
                  <div><dt>Reason</dt><dd>{actionable ? rec.reason : 'All monitored parameters are within their normal range.'}</dd></div>
                  {actionable && rec.dueBy && <div><dt>Complete by</dt><dd>{formatDate(rec.dueBy)}</dd></div>}
                  <div><dt>Scheduled date</dt><dd>{scheduledMs ? <strong>{formatDate(scheduledMs)}</strong> : 'Not yet scheduled'}</dd></div>
                </dl>
                <div className="am-plan-actions">
                  {scheduledMs ? (
                    <button type="button" className="am-btn am-btn--secondary" onClick={openModal}>Reschedule</button>
                  ) : (
                    <button type="button" className="am-btn am-btn--primary" onClick={openModal}>{actionable ? 'Schedule maintenance' : 'Schedule inspection'}</button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {showAll && !selectedParam && (
          <div className="am-modal-backdrop" onClick={closePlot}>
            <section className="am-card am-modal am-modal--plot" role="dialog" aria-modal="true" aria-label="Top contributing parameters" onClick={(e) => e.stopPropagation()}>
              <div className="am-card-head">
                <div>
                  <h2 className="am-card-title">Top contributing parameters · {system.name}</h2>
                  <p className="am-card-sub">{vessel.name} · shown as % deviation from each parameter's normal baseline so different units can be compared</p>
                </div>
                <button type="button" className="am-btn am-btn--ghost" onClick={closePlot}>Close</button>
              </div>
              <div className="am-chart am-chart--detail">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topParams[0].series.map((s, i) => {
                    const row = { t: s.t };
                    topParams.forEach((p) => {
                      const v = p.series[i]?.value;
                      row[p.id] = v == null ? null : Math.round(((v - p.baseline) / p.baseline) * 1000) / 10;
                      row[`${p.id}__raw`] = v;
                    });
                    return row;
                  })} margin={{ top: 10, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" minTickGap={40} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" width={56} />
                    <Tooltip
                      labelFormatter={(v) => formatDate(v)}
                      formatter={(v, name, item) => {
                        const p = topParams.find((x) => x.name === name);
                        return [`${v > 0 ? '+' : ''}${v}%  (${fmt(item.payload[`${p.id}__raw`])} ${p.unit})`, name];
                      }}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="5 4"
                      label={{ value: 'Normal baseline', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 12 }} />
                    {topParams.map((p, i) => (
                      <Line key={p.id} type="monotone" dataKey={p.id} name={p.name} stroke={PARAM_COLORS[i % PARAM_COLORS.length]} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="am-detail-legend">
                {topParams.map((p, i) => (
                  <button key={p.id} type="button" className="am-legend-item" onClick={() => { setShowAll(false); setParamId(p.id); }} title="Open this parameter on its own">
                    <i style={{ background: PARAM_COLORS[i % PARAM_COLORS.length] }} />
                    {p.name} · {fmt(p.current)} {p.unit} ({p.current >= p.baseline ? '+' : '−'}{p.deviation}%)
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {selectedParam && (
          <div className="am-modal-backdrop" onClick={closePlot}>
          <section className="am-card am-modal am-modal--plot" role="dialog" aria-modal="true" aria-label={selectedParam.name} onClick={(e) => e.stopPropagation()}>
            <div className="am-card-head">
              <div>
                <h2 className="am-card-title">{selectedParam.name}{compareParam ? ` vs ${compareParam.name}` : ''}</h2>
                <p className="am-card-sub">{vessel.name} · {system.name} · last {selectedParam.series.length} days</p>
              </div>
              <div className="am-detail-tools">
                <label className="am-field am-field--inline">
                  <span>Compare with</span>
                  <select value={compareParam?.id || ''} onChange={(e) => setCompareId(e.target.value)}>
                    <option value="">None</option>
                    {system.parameters.filter((p) => p.id !== selectedParam.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                {topParams.length > 1 && (
                  <button type="button" className="am-btn am-btn--ghost" onClick={() => { setParamId(null); setCompareId(''); setShowAll(true); }}>Show top {topParams.length} together</button>
                )}
                <button type="button" className="am-btn am-btn--ghost" onClick={closePlot}>Close</button>
              </div>
            </div>
            <div className="am-chart am-chart--detail">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedParam.series.map((s, i) => ({ t: s.t, a: s.value, b: compareParam ? compareParam.series[i]?.value : undefined }))} margin={{ top: 10, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" minTickGap={40} />
                  <YAxis yAxisId="a" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" width={60}
                    label={{ value: selectedParam.unit, angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }} />
                  {compareParam && (
                    <YAxis yAxisId="b" orientation="right" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-primary)" width={60}
                      label={{ value: compareParam.unit, angle: 90, position: 'insideRight', fill: 'var(--text-muted)', fontSize: 12 }} />
                  )}
                  <Tooltip labelFormatter={(v) => formatDate(v)} contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine yAxisId="a" y={selectedParam.baseline} stroke="var(--text-muted)" strokeDasharray="5 4"
                    label={{ value: 'Normal baseline', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Line yAxisId="a" type="monotone" dataKey="a" name={`${selectedParam.name} (${selectedParam.unit})`} stroke="var(--accent-blue-light)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  {compareParam && <Line yAxisId="b" type="monotone" dataKey="b" name={`${compareParam.name} (${compareParam.unit})`} stroke="var(--status-warning)" strokeWidth={2.5} dot={false} isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="am-detail-legend">
              <span><i style={{ background: 'var(--accent-blue-light)' }} />{selectedParam.name} ({selectedParam.unit})</span>
              {compareParam && <span><i style={{ background: 'var(--status-warning)' }} />{compareParam.name} ({compareParam.unit})</span>}
            </div>
          </section>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="am-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="am-modal" role="dialog" aria-modal="true" aria-label="Schedule maintenance" onClick={(e) => e.stopPropagation()}>
            <h3>{scheduledMs ? 'Reschedule maintenance' : 'Schedule maintenance'}</h3>
            <p className="am-modal-asset">{vessel.name} · {system.name}</p>
            <p className="am-modal-rec">{rec.action}</p>
            <label className="am-field">
              <span>Maintenance date</span>
              <input type="date" value={dateDraft} min={new Date(anchorMs).toISOString().slice(0, 10)} onChange={(e) => setDateDraft(e.target.value)} />
            </label>
            {rec.dueBy && dateDraft && Date.parse(`${dateDraft}T12:00:00Z`) > rec.dueBy && (
              <p className="am-modal-warn">This date is after the recommended completion date ({formatDate(rec.dueBy)}).</p>
            )}
            <div className="am-modal-actions">
              <button type="button" className="am-btn am-btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="am-btn am-btn--primary" onClick={confirmSchedule} disabled={!dateDraft}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
