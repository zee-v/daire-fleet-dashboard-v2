import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FleetOverviewPage from './pages/FleetOverviewPage';
import AssetMaintenancePage from './pages/AssetMaintenancePage';
import { PortfolioProvider } from './context/PortfolioContext';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <PortfolioProvider>
        <Layout>
          <Routes>
            <Route path="/fleet-overview" element={<FleetOverviewPage />} />
            <Route path="/asset-maintenance" element={<AssetMaintenancePage />} />
            <Route path="*" element={<Navigate to="/fleet-overview" replace />} />
          </Routes>
        </Layout>
      </PortfolioProvider>
    </BrowserRouter>
  );
}

export default App;
