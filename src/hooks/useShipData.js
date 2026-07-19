import { useRealtimeData } from './useRealtimeData';

export function useShipData(refreshInterval = 0) {
  return useRealtimeData('/api/ship/data', refreshInterval);
}
