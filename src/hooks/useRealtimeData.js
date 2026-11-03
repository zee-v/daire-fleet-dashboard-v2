import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for data fetching with real-time support
 * Currently uses polling, but structured for easy WebSocket conversion
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {number} refreshInterval - Refresh interval in ms (0 = no refresh)
 * @param {Object} options - Additional fetch options
 */
export function useRealtimeData(endpoint, refreshInterval = 30000, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const baseUrl = process.env.REACT_APP_EDP_API_URL || 'http://localhost:5002';
      const response = await fetch(`${baseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  useEffect(() => {
    fetchData(); // Initial fetch

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}

/**
 * Hook for WebSocket real-time updates (future implementation)
 * Currently returns mock connection, ready for real WebSocket
 */
export function useWebSocket(url, options = {}) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Implement WebSocket connection when real-time backend is ready
    // const ws = new WebSocket(url);
    // ws.onopen = () => setConnected(true);
    // ws.onmessage = (event) => setData(JSON.parse(event.data));
    // ws.onerror = (err) => setError(err.message);
    // ws.onclose = () => setConnected(false);
    // return () => ws.close();
    
    console.log('WebSocket hook ready for:', url);
    return () => {};
  }, [url]);

  return { data, connected, error };
}
