import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import UnifiedDashboardPage from './pages/UnifiedDashboardPage';
import FleetHealthPage from './pages/FleetHealthPage';
import MaintenancePage from './pages/MaintenancePage';

// Monitoring Pages
import SensorEventsPage from './pages/monitoring/SensorEventsPage';
import HealthScoresPage from './pages/monitoring/HealthScoresPage';
import KPIMonitoringPage from './pages/monitoring/KPIMonitoringPage';

// Analytics Pages
import HistoricalTrendsPage from './pages/analytics/HistoricalTrendsPage';
import KafkaAnalyticsPage from './pages/analytics/KafkaAnalyticsPage';
import HistoricalReplayPage from './pages/analytics/HistoricalReplayPage';
import HealthAnalysisPage from './pages/analytics/HealthAnalysisPage';

// Predictive Pages
import ActiveAlertsPage from './pages/predictive/ActiveAlertsPage';
import MaintenanceSchedulePage from './pages/predictive/MaintenanceSchedulePage';

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
            <Route path="/fleet-overview/alerts-summary" element={<ActiveAlertsPage />} />
            <Route path="/fleet-overview/trends-analytics" element={<HistoricalTrendsPage />} />

            {/* Live Monitoring */}
            <Route path="/live-monitoring/health-score" element={<HealthScoresPage />} />
            <Route path="/live-monitoring/kpi-monitoring" element={<KPIMonitoringPage />} />

            {/* dAIRE Analytics */}
            <Route path="/daire-analytics/historical-trends" element={<HistoricalTrendsPage />} />
            <Route path="/daire-analytics/kafka-analytics" element={<KafkaAnalyticsPage />} />
            <Route path="/daire-analytics/kpi-monitoring" element={<KPIMonitoringPage />} />
            <Route path="/daire-analytics/maintenance-recommendations" element={<MaintenanceSchedulePage />} />
            <Route path="/daire-analytics/predictive-alerts" element={<ActiveAlertsPage />} />
            <Route path="/daire-analytics/equipment-health-scores" element={<HealthScoresPage />} />
            <Route path="/daire-analytics/historical-replay" element={<HistoricalReplayPage />} />
            <Route path="/daire-analytics/sensor-events" element={<SensorEventsPage />} />

            {/* Predictive Maintenance — Vessel Components */}
            <Route path="/vessel-components/:fleetId/:componentId" element={<FleetHealthPage />} />

            {/* Legacy redirects */}
            <Route path="/unified-dashboard" element={<Navigate to="/fleet-overview" replace />} />
            <Route path="/fleet-health" element={<FleetHealthPage />} />
            <Route path="/maintenance-actions" element={<MaintenancePage />} />
            <Route path="/monitoring/sensor-events" element={<SensorEventsPage />} />
            <Route path="/monitoring/health-scores" element={<HealthScoresPage />} />
            <Route path="/monitoring/kpi-monitoring" element={<KPIMonitoringPage />} />
            <Route path="/analytics/historical-trends" element={<HistoricalTrendsPage />} />
            <Route path="/analytics/health-analysis" element={<HealthAnalysisPage />} />
            <Route path="/predictive/active-alerts" element={<ActiveAlertsPage />} />
            <Route path="/predictive/maintenance-schedule" element={<MaintenanceSchedulePage />} />

            {/* Default */}
            <Route path="*" element={<Navigate to="/fleet-overview" replace />} />
          </Routes>
        </Layout>
      </SelectionProvider>
    </BrowserRouter>
  );
}

export default App;
