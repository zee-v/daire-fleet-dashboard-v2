import React, { useMemo, useState } from 'react';
import { useComponent } from '../context/ComponentContext';
import { useShipData } from '../hooks/useShipData';
import './FleetPanel.css';

function healthColor(score) {
  if (score == null) return 'var(--text-muted)';
  if (score >= 75) return 'var(--status-healthy)';
  if (score >= 55) return 'var(--status-warning)';
  return 'var(--status-critical)';
}

function healthLabel(score) {
  if (score == null) return 'No data';
  if (score >= 75) return 'Healthy';
  if (score >= 55) return 'Degraded';
  return 'Critical';
}

const STATUS_COLOR = {
  healthy:  'var(--status-healthy)',
  warning:  'var(--status-warning)',
  critical: 'var(--status-critical)',
};

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="fp-mini-bar-track">
      <div className="fp-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function FleetPanel() {
  const { allFleets, selectedFleet, setSelectedFleet, selectedComponent, setSelectedComponent, getFleetComponents } = useComponent();
  const { data, loading } = useShipData();

  const [expandedFleetId, setExpandedFleetId] = useState(selectedFleet?.id);

  const latest = data?.hourly?.[data.hourly.length - 1];
  const ov = data?.overview;

  // Per-component health scores derived from latest penalty values (Beijing Maersk only)
  const componentHealth = useMemo(() => {
    if (!latest) return {};
    const scores = {};
    const maxByKey = { mechanical_contrib: 25, electrical_contrib: 20, thermal_contrib: 20 };
    (getFleetComponents('beijing-maersk') || []).forEach((c) => {
      const penalty = latest[c.penaltyKey] ?? 0;
      const max = maxByKey[c.penaltyKey] || 20;
      scores[c.id] = Math.max(0, Math.round(100 - (penalty / max) * 100));
    });
    return scores;
  }, [latest, getFleetComponents]);

  const penalties = useMemo(() => {
    if (!latest) return [];
    return [
      { label: 'Mechanical', value: latest.mechanical_contrib ?? 0, max: 25 },
      { label: 'Electrical', value: latest.electrical_contrib ?? 0, max: 20 },
      { label: 'Thermal',    value: latest.thermal_contrib    ?? 0, max: 20 },
      { label: 'Frequency',  value: latest.frequency_contrib  ?? 0, max: 15 },
      { label: 'Mismatch',   value: latest.mismatch_contrib   ?? 0, max: 10 },
      { label: 'Loading',    value: latest.loading_contrib    ?? 0, max: 10 },
    ];
  }, [latest]);

  const hScore = ov?.latest_health_score;
  const hColor = healthColor(hScore);

  function toggleFleet(fleet) {
    const willExpand = expandedFleetId !== fleet.id;
    setExpandedFleetId(willExpand ? fleet.id : null);
    if (willExpand) setSelectedFleet(fleet);
  }

  return (
    <aside className="fleet-panel">
      {/* Overall health ring — always Beijing Maersk real data */}
      <div className="fp-health-block">
        <div className="fp-health-ring" style={{ borderColor: hColor }}>
          <span className="fp-health-score" style={{ color: hColor }}>
            {loading ? '…' : (hScore ?? '—')}
          </span>
          <span className="fp-health-label">Health</span>
        </div>
        <div className="fp-health-status" style={{ color: hColor }}>
          {loading ? 'Loading…' : healthLabel(hScore)}
        </div>
        <div className="fp-health-period">{ov?.data_period ?? 'Apr 2026'}</div>
      </div>

      {/* Penalty breakdown (Beijing Maersk) */}
      {penalties.length > 0 && (
        <>
          <div className="fp-section-title">Health Breakdown</div>
          <div className="fp-penalties">
            {penalties.map((p) => {
              const pct = p.value / p.max;
              const c = pct < 0.3 ? 'var(--status-healthy)' : pct < 0.6 ? 'var(--status-warning)' : 'var(--status-critical)';
              return (
                <div key={p.label} className="fp-penalty-row">
                  <div className="fp-penalty-name">{p.label}</div>
                  <MiniBar value={p.value} max={p.max} color={c} />
                  <div className="fp-penalty-val" style={{ color: c }}>{p.value?.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Fleet list */}
      <div className="fp-section-title">Fleets & Components</div>
      <div className="fp-fleet-list">
        {allFleets.map((fleet) => {
          const isExpanded = expandedFleetId === fleet.id;
          const isActiveFleet = selectedFleet?.id === fleet.id;
          const comps = getFleetComponents(fleet.id);

          return (
            <div key={fleet.id} className="fp-fleet-item">
              <button
                type="button"
                className={`fp-fleet-btn${isActiveFleet ? ' fp-fleet-btn--active' : ''}`}
                onClick={() => toggleFleet(fleet)}
              >
                <span className="fp-fleet-arrow">{isExpanded ? '▾' : '▸'}</span>
                <span className="fp-fleet-name">{fleet.name}</span>
                {fleet.id === 'beijing-maersk' && (
                  <span className="fp-fleet-live">LIVE</span>
                )}
              </button>

              {isExpanded && (
                <div className="fp-comp-list">
                  {comps.map((c) => {
                    const score = fleet.id === 'beijing-maersk' ? componentHealth[c.id] : null;
                    const dotColor = score != null
                      ? healthColor(score)
                      : STATUS_COLOR[c.status] || 'var(--text-muted)';
                    const isSelected = isActiveFleet && selectedComponent?.id === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`fp-comp-btn${isSelected ? ' fp-comp-btn--active' : ''}`}
                        onClick={() => { setSelectedFleet(fleet); setSelectedComponent(c); }}
                      >
                        <span className="fp-comp-dot" style={{ background: dotColor }} />
                        <span className="fp-comp-name">{c.name}</span>
                        {score != null && (
                          <span className="fp-comp-score" style={{ color: dotColor }}>{score}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
