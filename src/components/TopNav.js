import React from 'react';
import { NavLink } from 'react-router-dom';
import './TopNav.css';

export default function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav-brand">
        <span className="top-nav-logo">◈</span>
        <span className="top-nav-name">dAIRE</span>
        <span className="top-nav-sub">Fleet Intelligence</span>
      </div>
      <nav className="top-nav-tabs">
        <NavLink to="/live-performance" className={({ isActive }) => `top-nav-tab${isActive ? ' active' : ''}`}>
          Live Performance
        </NavLink>
        <NavLink to="/asset-health" className={({ isActive }) => `top-nav-tab${isActive ? ' active' : ''}`}>
          Asset Health Planning
        </NavLink>
      </nav>
      <div className="top-nav-meta">
        <span className="top-nav-vessel">Beijing Maersk</span>
        <span className="top-nav-imo">IMO 9984572</span>
      </div>
    </header>
  );
}
