import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { usePortfolio } from '../context/PortfolioContext';
import { PERIODS, STATUS_LABEL, formatDate } from '../data/portfolio';
import './FleetOverviewPage.css';

const STATUS_COLOR = { healthy: 'var(--status-healthy)', warning: 'var(--status-warning)', critical: 'var(--status-critical)' };
const STATUSES = ['healthy', 'warning', 'critical'];

const maintenanceLink = (vessel, systemId) =>
  `/asset-maintenance?fleet=${vessel.fleetId}&vessel=${vessel.id}&system=${systemId || vessel.worstSystemId}`;

export default function FleetOverviewPage() {
  const { portfolio, loading } = usePortfolio();
  const navigate = useNavigate();
  const [periodId, setPeriodId] = useState('30d');

  const period = PERIODS.find((p) => p.id === periodId);

  const view = useMemo(() => {
    if (!portfolio) return null;
    const { fleets, events, anchorMs } = portfolio;
    const allVessels = fleets.flatMap((f) => f.vessels);
    const cutoff = anchorMs - period.days * 86400000;
    const periodEvents = events.filter((e) => e.resolvedMs >= cutoff).sort((a, b) => b.resolvedMs - a.resolvedMs);

    const openRequirements = allVessels.filter((v) => v.status !== 'healthy').length;
    const criticalOpen = allVessels.filter((v) => v.status === 'critical').length;
    const overallHealth = Math.round(allVessels.reduce((a, v) => a + v.health, 0) / allVessels.length);

    return { fleets, allVessels, periodEvents, openRequirements, criticalOpen, overallHealth, anchorMs };
  }, [portfolio, period]);

  if (loading || !view) {
    return (
      <div className="fo-page">
        <PageHeader title="Fleet Overview" subtitle="Loading fleet data…" />
      </div>
    );
  }

  const { fleets, allVessels, periodEvents, openRequirements, criticalOpen, overallHealth } = view;
  const kpis = [
    { label: 'Total Fleets', value: fleets.length, sub: `${allVessels.length} vessels under management`, accent: 'var(--accent-blue)' },
    { label: 'Active Alerts', value: openRequirements, sub: `${criticalOpen} critical · ${openRequirements - criticalOpen} warning`, accent: 'var(--status-warning)' },
    { label: 'Overall Asset Health', value: `${overallHealth}%`, sub: `Average across ${allVessels.length} vessels`, accent: 'var(--status-healthy)' },
    { label: `Events Resolved · ${period.label}`, value: periodEvents.length, sub: 'Maintenance events closed', accent: '#8b5cf6' },
  ];

  return (
    <div className="fo-page">
      <PageHeader title="Fleet Overview" subtitle={`Operational summary · data as of ${formatDate(view.anchorMs)}`}>
        <div className="fo-period" role="group" aria-label="Reporting period">
          <span className="fo-period-label">Period</span>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={`fo-chip${p.id === periodId ? ' fo-chip--on' : ''}`} onClick={() => setPeriodId(p.id)}>
              {p.short}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="fo-body">
        <section className="fo-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="fo-kpi" style={{ '--accent': k.accent }}>
              <div className="fo-kpi-label">{k.label}</div>
              <div className="fo-kpi-value">{k.value}</div>
              <div className="fo-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="fo-section-title">Fleet Summary</h2>
          <div className="fo-fleets">
            {fleets.map((f) => {
              const top = f.topIssue;
              const topSystem = top?.systems.find((s) => s.id === top.worstSystemId);
              return (
                <article key={f.id} className="fo-card fo-fleet">
                  <div className="fo-fleet-head">
                    <div>
                      <h3 className="fo-fleet-name">{f.name}</h3>
                      <div className="fo-fleet-region">{f.region} · {f.vessels.length} vessels</div>
                    </div>
                    <div className="fo-fleet-health">{f.health}%</div>
                  </div>
                  <div className="fo-bar" aria-label="Vessel status distribution">
                    {STATUSES.map((s) => f.counts[s] > 0 && (
                      <span key={s} style={{ flex: f.counts[s], background: STATUS_COLOR[s] }} title={`${f.counts[s]} ${STATUS_LABEL[s]}`} />
                    ))}
                  </div>
                  <div className="fo-fleet-counts">
                    {STATUSES.map((s) => (
                      <span key={s}><span className="fo-dot" style={{ background: STATUS_COLOR[s] }} />{f.counts[s]} {STATUS_LABEL[s]}</span>
                    ))}
                  </div>
                  <div className="fo-fleet-req">
                    <span className="fo-fleet-req-num">{f.requirements}</span>
                    <span>active maintenance {f.requirements === 1 ? 'requirement' : 'requirements'}</span>
                  </div>
                  {top ? (
                    <button type="button" className="fo-fleet-issue" onClick={() => navigate(maintenanceLink(top))}>
                      <span className="fo-fleet-issue-label">Highest priority</span>
                      <span className="fo-fleet-issue-main">{top.name}</span>
                      <span className="fo-fleet-issue-sub">{topSystem?.name} · <StatusBadge status={top.status} /></span>
                    </button>
                  ) : (
                    <div className="fo-fleet-issue fo-fleet-issue--ok">
                      <span className="fo-fleet-issue-label">Highest priority</span>
                      <span className="fo-fleet-issue-main">No open issues</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="fo-card">
          <div className="fo-card-head">
            <h2 className="fo-card-title">Recent Resolved Events</h2>
            <span className="fo-scope">{period.label} · {periodEvents.length} {periodEvents.length === 1 ? 'event' : 'events'}</span>
          </div>
          {periodEvents.length === 0 ? (
            <p className="fo-empty">No maintenance events were resolved in this period.</p>
          ) : (
            <div className="fo-table-wrap">
              <table className="fo-table">
                <thead>
                  <tr><th>Fleet</th><th>Vessel</th><th>System</th><th>Failure / issue</th><th>Resolved</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {periodEvents.map((e) => (
                    <tr key={`${e.vessel}-${e.daysAgo}`}>
                      <td>{e.fleet}</td>
                      <td className="fo-strong">{e.vessel}</td>
                      <td>{e.system}</td>
                      <td>{e.issue}</td>
                      <td>{formatDate(e.resolvedMs)}</td>
                      <td><span className={`fo-res fo-res--${e.status.toLowerCase()}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
