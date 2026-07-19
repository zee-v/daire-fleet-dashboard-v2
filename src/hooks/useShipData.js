import { useState, useEffect } from 'react';

let _cache = null;

export function useShipData() {
  const [data, setData] = useState(_cache);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setData(_cache); setLoading(false); return; }
    fetch('/data/shipData.json')
      .then((r) => r.json())
      .then((d) => { _cache = d; setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { data, loading };
}
