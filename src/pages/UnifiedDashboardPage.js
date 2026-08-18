import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useShipData } from '../hooks/useShipData';
import { ALL_FLEETS } from '../data/mock';
import './UnifiedDashboardPage.css';

function useDashboardData() {
  const { data, loading } = useShipData();

  return useMemo(() => {
    if (loading || !data) return { loading, dashboardData: null };

    const hourly = data.hourly || [];
    const ov = data.overview;
    const allAlerts = data.allAlerts || [];

    // Fleet timeline — subsample to 60 points
    const step = Math.max(1, Math.ceil(hourly.length / 60));
    const fleetTimeline = hourly
      .filter((_, i) => i % step === 0)
      .map(h => ({ _t: h.hour_ts, value: h.health_score, label: `Fleet Asia-Europe · Beijing Maersk` }));

    // Vessel health per fleet (Fleet Asia-Europe is real; others are mock)
    const byVessel = {};
    ALL_FLEETS.forEach(fleet => {
      if (fleet.id === 'beijing-maersk') {
        const step2 = Math.max(1, Math.ceil(hourly.length / 30));
        byVessel[fleet.name] = {
          healthTrend: hourly.filter((_, i) => i % step2 === 0).map(h => ({ value: h.health_score })),
          alerts: { totalAlerts: allAlerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length },
        };
      } else {
        const mockHealth = { 'Fleet Atlantic': 82, 'Fleet Pacific': 91, 'Fleet Mediterranean': 75 }[fleet.name] || 80;
        byVessel[fleet.name] = {
          healthTrend: [{ value: mockHealth }],
          alerts: { totalAlerts: 0 },
        };
      }
    });

    const criticalAlerts = allAlerts.filter(a => a.severity === 'critical').length;
    const activeAlerts = allAlerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;

    const dashboardData = {
      kpi: {
        overallHealth: Math.round(ov?.latest_health_score ?? 0),
        activeAlerts,
        criticalAlerts,
      },
      fleetTimeline,
      byVessel,
    };

    return { loading: false, dashboardData };
  }, [data, loading]);
}

function UnifiedDashboardPage() {
  const navigate = useNavigate();
  const { loading, dashboardData } = useDashboardData();

  return (
    <div className="unified-dashboard">
      <div className="unified-header">
        <div>
          <h1 className="unified-title">dAIRE Maritime Predictive Maintenance</h1>
          <p className="unified-subtitle">Fleet Overview Dashboard</p>
        </div>
      </div>

      <div className="unified-content">
        <OverviewTab data={dashboardData} loading={loading} navigate={navigate} />
      </div>

    </div>
  );
}

// TAB 1: FLEET OVERVIEW
function OverviewTab({ data, loading, navigate }) {
  if (loading) return <div className="loading-state">Loading fleet data...</div>;
  if (!data) return <div className="error-state">Failed to load data. Check backend server.</div>;

  const stats = [
    { 
      label: 'Total Vessels', 
      value: Object.keys(data.byVessel || {}).length, 
      unit: '', 
      icon: 'V',
      color: '#3b82f6',
      trend: 'Across fleet'
    },
    { 
      label: 'Active Alerts', 
      value: data.kpi?.activeAlerts || 0, 
      unit: '', 
      icon: '!',
      color: '#f59e0b',
      trend: `${data.kpi?.criticalAlerts || 0} critical`
    },
    { 
      label: 'Avg Fleet Health', 
      value: data.kpi?.overallHealth || 0, 
      unit: '%', 
      icon: 'H',
      color: '#22c55e',
      trend: 'Overall status'
    },
    { 
      label: 'Total Events', 
      value: data.fleetTimeline?.length || 0, 
      unit: '', 
      icon: 'E',
      color: '#8b5cf6',
      trend: 'Health readings'
    },
  ];

  const timelineData = (data.fleetTimeline || []).slice(-30).map(point => ({
    time: point?._t ? new Date(point._t).toLocaleDateString() : 'Unknown',
    health: point?.value || 0,
    vessel: point?.label?.split(' · ')?.[1] || 'Unknown'
  }));

  const vesselHealthData = Object.entries(data.byVessel || {}).map(([name, vessel]) => {
    const latestHealth = vessel?.healthTrend?.[vessel.healthTrend.length - 1]?.value || 0;
    return {
      name: name,
      health: latestHealth,
      alerts: vessel?.alerts?.totalAlerts || 0
    };
  }).sort((a, b) => a.health - b.health);

  return (
    <div className="tab-content">
      <div className="kpi-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="kpi-card" style={{ borderTopColor: stat.color }}>
            <div className="kpi-icon" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="kpi-body">
              <div className="kpi-label">{stat.label}</div>
              <div className="kpi-value">
                {stat.value}<span className="kpi-unit">{stat.unit}</span>
              </div>
              <div className="kpi-trend">{stat.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card chart-card--full">
          <h3 className="chart-title">Fleet Health Timeline (Last 30 Events)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Area 
                type="monotone" 
                dataKey="health" 
                stroke="#22c55e" 
                fill="url(#healthGradient)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-card--half">
          <h3 className="chart-title">Vessel Health Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vesselHealthData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis type="number" stroke="var(--text-tertiary)" fontSize={12} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" stroke="var(--text-tertiary)" fontSize={11} width={80} tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="health" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-card--half">
          <h3 className="chart-title">Vessels Requiring Attention</h3>
          <div className="vessel-list">
            {vesselHealthData.filter(v => v.health < 70 || v.alerts > 0).length > 0 ? (
              vesselHealthData.filter(v => v.health < 70 || v.alerts > 0).map((vessel, idx) => (
                <div key={idx} className="vessel-list-item">
                  <div className="vessel-list-info">
                    <span className="vessel-list-name">{vessel.name}</span>
                    <span className={`vessel-list-status ${vessel.health < 50 ? 'critical' : 'warning'}`}>
                      {vessel.health < 50 ? 'Critical' : 'Warning'}
                    </span>
                  </div>
                  <div className="vessel-list-metrics">
                    <span className="vessel-metric">Health: {vessel.health}%</span>
                    <span className="vessel-metric">Alerts: {vessel.alerts}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-critical-vessels">
                <p>All vessels operating normally</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn action-btn--primary" onClick={() => navigate('/maintenance-actions')}>
            Schedule Maintenance
          </button>
          <button className="action-btn action-btn--secondary" onClick={() => navigate('/fleet-overview/health-report')}>
            Detailed Health Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnifiedDashboardPage;
