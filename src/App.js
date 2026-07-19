import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import UnifiedDashboardPage from './pages/UnifiedDashboardPage';
import FleetHealthPage from './pages/FleetHealthPage';
import MaintenancePage from './pages/MaintenancePage';

// Live Monitoring Pages
import SensorEventsPage from './pages/monitoring/SensorEventsPage';
import HealthScoresPage from './pages/monitoring/HealthScoresPage';
import KPIMonitoringPage from './pages/monitoring/KPIMonitoringPage';
import AlertsEventsPage from './pages/monitoring/AlertsEventsPage';

// dAIRE Analytics — XLSX-driven Beijing Maersk pages
import ShipOverviewPage from './pages/ship/ShipOverviewPage';
import EnergyEfficiencyPage from './pages/ship/EnergyEfficiencyPage';
import GeneratorPerformancePage from './pages/ship/GeneratorPerformancePage';
import ShipHistoricalTrendsPage from './pages/ship/ShipHistoricalTrendsPage';
import ShaftTelemetryPage from './pages/ship/ShaftTelemetryPage';
import ComponentSummaryPage from './pages/ship/ComponentSummaryPage';
import ThermalHealthPage from './pages/ship/ThermalHealthPage';

import { SelectionProvider } from './context/SelectionContext';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <SelectionProvider>
        <Layout>
          <Routes>
            {/* Fleet Overview */}
            <Route path="/fleet-overview" element={<UnifiedDashboardPage />} />
            <Route path="/fleet-overview/health-report" element={<HealthScoresPage />} />
            <Route path="/fleet-overview/alerts-summary" element={<AlertsEventsPage />} />
            <Route path="/fleet-overview/trends-analytics" element={<ShipHistoricalTrendsPage />} />

            {/* Live Monitoring */}
            <Route path="/live-monitoring/health-score" element={<HealthScoresPage />} />
            <Route path="/live-monitoring/kpi-monitoring" element={<KPIMonitoringPage />} />
            <Route path="/live-monitoring/alerts-events" element={<AlertsEventsPage />} />

            {/* dAIRE Analytics — Beijing Maersk XLSX pages */}
            <Route path="/daire-analytics/ship-overview" element={<ShipOverviewPage />} />
            <Route path="/daire-analytics/energy-efficiency" element={<EnergyEfficiencyPage />} />
            <Route path="/daire-analytics/generator-performance" element={<GeneratorPerformancePage />} />
            <Route path="/daire-analytics/historical-trends" element={<ShipHistoricalTrendsPage />} />
            <Route path="/daire-analytics/shaft-telemetry" element={<ShaftTelemetryPage />} />
            <Route path="/daire-analytics/component-summary" element={<ComponentSummaryPage />} />
            <Route path="/daire-analytics/thermal-health" element={<ThermalHealthPage />} />

            {/* Predictive Maintenance — Vessel Components */}
            <Route path="/vessel-components/:fleetId/:componentId" element={<FleetHealthPage />} />

            {/* Legacy redirects */}
            <Route path="/unified-dashboard" element={<Navigate to="/fleet-overview" replace />} />
            <Route path="/fleet-health" element={<FleetHealthPage />} />
            <Route path="/maintenance-actions" element={<MaintenancePage />} />
            <Route path="/monitoring/sensor-events" element={<SensorEventsPage />} />
            <Route path="/monitoring/health-scores" element={<HealthScoresPage />} />

            {/* Default */}
            <Route path="*" element={<Navigate to="/fleet-overview" replace />} />
          </Routes>
        </Layout>
      </SelectionProvider>
    </BrowserRouter>
  );
}

export default App;
