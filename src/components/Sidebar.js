import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getFleets } from '../services/fleetService';
import { getComponents } from '../services/componentService';
import { useSelection } from '../context/SelectionContext';
import './Sidebar.css';

const STATUS_COLOR = {
  critical: '#ef4444',
  warning: '#f59e0b',
  healthy: '#22c55e',
  informational: '#60a5fa',
};

const ROUTE_SECTIONS = [
  {
    id: 'fleet-overview',
    label: 'Fleet Overview',
    icon: '▦',
    defaultExpanded: true,
    children: [
      { label: 'Dashboard', route: '/fleet-overview', end: true },
      { label: 'Detailed Health Report', route: '/fleet-overview/health-report' },
      { label: 'Alerts Summary', route: '/fleet-overview/alerts-summary' },
      { label: 'Trends / Analytics', route: '/fleet-overview/trends-analytics' },
    ],
  },
  {
    id: 'live-monitoring',
    label: 'Live Monitoring',
    icon: '◉',
    children: [
      { label: 'Alerts & Events', route: '/live-monitoring/alerts-events' },
    ],
  },
  {
    id: 'daire-analytics',
    label: 'dAIRE Analytics',
    icon: '◈',
    children: [
      { label: 'Ship Overview', route: '/daire-analytics/ship-overview' },
      { label: 'Energy & Efficiency', route: '/daire-analytics/energy-efficiency' },
      { label: 'Generator Performance', route: '/daire-analytics/generator-performance' },
      { label: 'Historical Trends', route: '/daire-analytics/historical-trends' },
      { label: 'Shaft Telemetry', route: '/daire-analytics/shaft-telemetry' },
      { label: 'Component Summary', route: '/daire-analytics/component-summary' },
      { label: 'Thermal & Winding Health', route: '/daire-analytics/thermal-health' },
    ],
  },
];

function isChildRouteActive(pathname, child) {
  return child.end ? pathname === child.route : pathname.startsWith(child.route);
}

function RouteChildLink({ item }) {
  return (
    <NavLink
      to={item.route}
      end={item.end}
      className={({ isActive }) => `nav-comp-row sidebar-child-link${isActive ? ' nav-comp-row--active' : ''}`}
      title={item.label}
    >
      <span className="nav-comp-label">{item.label}</span>
    </NavLink>
  );
}

function RouteSection({ section }) {
  const { pathname } = useLocation();
  const sectionIsActive = section.children.some((child) => isChildRouteActive(pathname, child));
  const [expanded, setExpanded] = useState(section.defaultExpanded || sectionIsActive);

  useEffect(() => {
    if (sectionIsActive) setExpanded(true);
  }, [sectionIsActive]);

  return (
    <div className="nav-item-wrapper">
      <button
        type="button"
        className={`nav-item sidebar-group-toggle${sectionIsActive ? ' nav-item--active' : ''}`}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <span className="nav-icon">{section.icon}</span>
        <span className="nav-label">{section.label}</span>
        <span className={`nav-arrow ${expanded ? 'nav-arrow--open' : ''}`}>›</span>
      </button>
      {expanded && (
        <div className="nav-children sidebar-group-children">
          {section.children.map((child) => (
            <RouteChildLink key={child.route} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentItem({ component, fleetId }) {
  const { setSelection } = useSelection();
  const route = `/vessel-components/${fleetId}/${component.id}`;
  const selectComponent = () => setSelection({ fleetId, componentId: component.id });

  return (
    <NavLink
      to={route}
      className={({ isActive }) => `nav-comp-row${isActive ? ' nav-comp-row--active' : ''}`}
      onClick={selectComponent}
      title={component.name}
    >
      <span className="nav-status-dot" style={{ background: STATUS_COLOR[component.status] || '#64748b' }} />
      <span className="nav-comp-label">{component.name}</span>
    </NavLink>
  );
}

function FleetItem({ fleet }) {
  const { pathname } = useLocation();
  const components = getComponents(fleet.id);
  const routePrefix = `/vessel-components/${fleet.id}/`;
  const fleetIsActive = pathname.startsWith(routePrefix);
  const [expanded, setExpanded] = useState(fleetIsActive);

  useEffect(() => {
    if (fleetIsActive) setExpanded(true);
  }, [fleetIsActive]);

  return (
    <div className="nav-item-wrapper">
      <button
        type="button"
        className={`nav-item sidebar-group-toggle${fleetIsActive ? ' nav-item--active' : ''}`}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <span className="nav-icon">▤</span>
        <span className="nav-label">{fleet.name}</span>
        <span className={`nav-arrow ${expanded ? 'nav-arrow--open' : ''}`}>›</span>
      </button>
      {expanded && (
        <div className="nav-children">
          {components.map((c) => (
            <ComponentItem key={c.id} component={c} fleetId={fleet.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function PredictiveMaintenanceSection({ fleets }) {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith('/vessel-components/');
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div className="nav-item-wrapper">
      <button
        type="button"
        className={`nav-item sidebar-group-toggle${isActive ? ' nav-item--active' : ''}`}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <span className="nav-icon">◇</span>
        <span className="nav-label">Predictive Maintenance</span>
        <span className={`nav-arrow ${expanded ? 'nav-arrow--open' : ''}`}>›</span>
      </button>
      {expanded && (
        <div className="nav-children sidebar-group-children">
          {fleets.map((fleet) => (
            <FleetItem key={fleet.id} fleet={fleet} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const fleets = getFleets();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <span className="logo-icon">◈</span>
          <span className="logo-text">dAIRE</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {ROUTE_SECTIONS.map((section) => (
          <RouteSection key={section.id} section={section} />
        ))}

        <PredictiveMaintenanceSection fleets={fleets} />
      </nav>

      <div className="sidebar-theme-toggle">
        <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <span className="theme-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div className="sidebar-legend">
        <div className="legend-row"><span className="legend-dot" style={{ background: '#ef4444' }} />Critical</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: '#f59e0b' }} />Warning</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: '#22c55e' }} />Healthy</div>
      </div>
    </aside>
  );
}
