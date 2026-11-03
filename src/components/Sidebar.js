import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { to: '/fleet-overview', label: 'Fleet Overview', icon: '▦' },
  { to: '/asset-maintenance', label: 'Asset Maintenance Requirements', icon: '⚙' },
];

export default function Sidebar() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* storage unavailable */ }
  }, [theme]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img className="logo-img" src="/daire-logo.png" alt="dAIRE — AI for Reliable Engineering" />
        <div className="sidebar-product">Asset Management</div>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-navlink${isActive ? ' sidebar-navlink--active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-theme-toggle">
        <button type="button" className="theme-toggle-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
}
