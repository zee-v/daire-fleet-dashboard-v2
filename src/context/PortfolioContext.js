import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useShipData } from '../hooks/useShipData';
import { buildPortfolio } from '../data/portfolio';

const PortfolioContext = createContext(null);
const STORAGE_KEY = 'daire-v3-schedule';

function loadSchedule() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function PortfolioProvider({ children }) {
  const { data, loading } = useShipData();
  const portfolio = useMemo(() => (data ? buildPortfolio(data) : null), [data]);
  const [schedule, setScheduleState] = useState(loadSchedule);

  const setSchedule = useCallback((vesselId, ms) => {
    setScheduleState((prev) => {
      const next = { ...prev, [vesselId]: ms };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ portfolio, loading, schedule, setSchedule }), [portfolio, loading, schedule, setSchedule]);
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
