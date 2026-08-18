import React from 'react';
import TopNav from './TopNav';
import FleetPanel from './FleetPanel';
import { ComponentProvider } from '../context/ComponentContext';
import './DashboardLayout.css';

export default function DashboardLayout({ children }) {
  return (
    <ComponentProvider>
      <div className="dash-root">
        <TopNav />
        <div className="dash-body">
          <FleetPanel />
          <div className="dash-content">{children}</div>
        </div>
      </div>
    </ComponentProvider>
  );
}
