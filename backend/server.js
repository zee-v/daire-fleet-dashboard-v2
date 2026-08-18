/**
 * Reads EDP.csv from ./data/EDP.csv and exposes aggregated metrics for the React app.
 * Default port 5000. (SIADEMO mock fleet API is separate — often on 5001.)
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const envPort = parseInt(process.env.PORT, 10);
const PORT = Number.isFinite(envPort) && envPort > 0 ? envPort : 5000;
const CSV_PATH =
  process.env.EDP_CSV_PATH || path.join(__dirname, 'data', 'EDP.csv');

// Component configuration mapping
const COMPONENTS = [
  { id: 'engine-system', name: 'Engine System', fileName: 'EDP.csv' },
  { id: 'cooling-system', name: 'Cooling System', fileName: 'EDP - Copy.csv' },
  { id: 'electrical-system', name: 'Electrical System', fileName: 'EDP - Copy (2).csv' },
];

function normalizeTail(name) {
  if (!name) return '';
  const m = String(name).trim().match(/^tail\s*(\d+)$/i);
  if (m) return `Tail ${m[1]}`;
  return String(name).trim();
}

function parseDate(d) {
  const s = String(d).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/);
  if (!m) return new Date(0);
  const [, dd, mm, yyyy, hh, min] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      const key = h || `col${idx}`;
      row[key] = (parts[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function rowHealthValue(row) {
  const pred = Number(row.Prediction || 0);
  const re = Number(String(row['Recons Error'] || '0').replace(/,/g, ''));
  if (Number.isNaN(re)) return pred ? 35 : 88;
  if (pred === 1) return Math.max(15, Math.min(55, Math.round(50 - (re - 2.2) * 12)));
  return Math.max(55, Math.min(100, Math.round(92 - re * 8)));
}

/** CSV "Normalized Values" is treated as 0–1 anomaly/badness; map to health score 0–100 (higher = healthier). */
function normalizedHealthFromRow(row) {
  const raw = String(row['Normalized Values'] ?? '').trim().replace(/,/g, '');
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  const t = Math.max(0, Math.min(1, n));
  return Math.round((1 - t) * 100);
}

function trendHealthValue(row) {
  const fromNorm = normalizedHealthFromRow(row);
  return fromNorm !== null ? fromNorm : rowHealthValue(row);
}

function formatTrendLabel(row) {
  const dt = parseDate(row.DateTime);
  const raw = String(row.DateTime || '').trim();
  if (Number.isNaN(dt.getTime())) return raw.slice(0, 22);
  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function rowSortMs(row) {
  const ms = parseDate(row.DateTime).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function toAlertDetailRow(r) {
  const tail = normalizeTail(r.FlightName);
  return {
    dateTime: String(r.DateTime || '').trim(),
    tail: tail || '—',
    active: Number(r.Active) === 1,
    rootCause: String(r.RootCause || '').trim() || '—',
    rcComponent: String(r.RCComponent || '').trim() || '—',
    reconsError: String(r['Recons Error'] || '').trim(),
  };
}

/** Fleet-wide Alerts Summary row + sparkline (all CSV rows, same rules as per-tail). */
function buildFleetAlertsSummary(allRows) {
  const sorted = [...allRows]
    .filter((r) => String(r.DateTime || '').trim())
    .sort((a, b) => parseDate(a.DateTime) - parseDate(b.DateTime));
  const alertsHere = sorted.filter((r) => Number(r.Prediction) === 1);
  const lastAlertRow = [...sorted].reverse().find((r) => Number(r.Prediction) === 1);
  const lastAlert = lastAlertRow ? String(lastAlertRow.DateTime).trim() : '—';
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half).filter((r) => Number(r.Prediction) === 1).length;
  const secondHalf = sorted.slice(half).filter((r) => Number(r.Prediction) === 1).length;
  const denom = Math.max(1, half);
  const delta = Math.round(((secondHalf - firstHalf) / denom) * 100);
  const trendValue = `${Math.abs(delta)}% vs earlier`;
  const sparkline = sorted.map((r) => (Number(r.Prediction) === 1 ? 100 : 0));
  return {
    totalAlerts: alertsHere.length,
    lastAlert,
    trendDirection: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
    trendValue,
    sparkline,
  };
}

function buildDashboard(rows) {
  const n = rows.length;
  const predOnes = rows.filter((r) => Number(r.Prediction) === 1);
  const critical = rows.filter(
    (r) => Number(r.Prediction) === 1 && Number(r.Active) === 1,
  );
  const activeAlerts = predOnes.length;
  const criticalAlerts = critical.length;
  const overallHealth =
    n === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + trendHealthValue(r), 0) / n);

  const byTail = {};
  for (const row of rows) {
    const tail = normalizeTail(row.FlightName);
    if (!tail) continue;
    if (!byTail[tail]) byTail[tail] = [];
    byTail[tail].push(row);
  }

  const byVessel = {};
  for (const [tail, list] of Object.entries(byTail)) {
    const sorted = [...list].sort(
      (a, b) => parseDate(a.DateTime) - parseDate(b.DateTime),
    );
    const healthTrend = sorted.map((r, i) => ({
      x: i,
      label: `${formatTrendLabel(r)} · ${tail}`,
      value: trendHealthValue(r),
      _t: rowSortMs(r),
    }));

    const alertsHere = sorted.filter((r) => Number(r.Prediction) === 1);
    const alertDetails = [...alertsHere]
      .sort((a, b) => parseDate(a.DateTime) - parseDate(b.DateTime))
      .map(toAlertDetailRow);
    const lastAlertRow = [...sorted].reverse().find((r) => Number(r.Prediction) === 1);
    const lastAlert = lastAlertRow
      ? String(lastAlertRow.DateTime)
      : '—';
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half).filter((r) => Number(r.Prediction) === 1).length;
    const secondHalf = sorted.slice(half).filter((r) => Number(r.Prediction) === 1).length;
    const denom = Math.max(1, half);
    const delta = Math.round(((secondHalf - firstHalf) / denom) * 100);
    const trendValue = `${Math.abs(delta)}% vs earlier`;

    const sparkline = sorted.map((r) => (Number(r.Prediction) === 1 ? 100 : 0));

    const latest = sorted[sorted.length - 1] || {};
    const lastPred = Number(latest.Prediction || 0);
    const lastRe = Number(String(latest['Recons Error'] || '0').replace(/,/g, '')) || 0;
    const estimatedDays = lastPred
      ? Math.max(3, Math.min(21, Math.round(14 - (lastRe - 2.2) * 3)))
      : Math.max(25, Math.round(45 - lastRe * 5));
    const confidence = lastPred ? Math.max(62, Math.min(92, Math.round(88 - lastRe * 4))) : 91;
    const risk = lastPred ? 'Critical' : 'Healthy';
    const rc = latest.RootCause || 'Fleet monitoring';
    const comp = latest.RCComponent || 'Component';

    byVessel[tail] = {
      healthTrend,
      alerts: {
        totalAlerts: alertsHere.length,
        lastAlert,
        trendDirection: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
        trendValue,
        sparkline,
        alertDetails,
      },
      prediction: {
        estimatedDays,
        confidence,
        accuracyEstimate: Math.max(70, Math.min(95, confidence - 5)),
        risk,
        recommendation: lastPred
          ? `Alert condition on ${tail}: ${rc} (${comp}). Review thresholds and schedule inspection.`
          : `No active prediction alert for ${tail}. Continue routine monitoring.`,
        suggestedAction: lastPred
          ? 'Review latest readings and plan a maintenance window.'
          : 'Maintain current operating profile.',
      },
    };
  }

  const fleetRows = [...rows]
    .filter((r) => normalizeTail(r.FlightName))
    .sort((a, b) => parseDate(a.DateTime) - parseDate(b.DateTime));
  const fleetTimeline = fleetRows.map((r, i) => {
    const tail = normalizeTail(r.FlightName);
    return {
      x: i,
      label: `${formatTrendLabel(r)} · ${tail}`,
      value: trendHealthValue(r),
      _t: rowSortMs(r),
    };
  });

  const fleetAlertDetails = rows
    .filter((r) => normalizeTail(r.FlightName) && Number(r.Prediction) === 1)
    .sort((a, b) => parseDate(a.DateTime) - parseDate(b.DateTime))
    .map(toAlertDetailRow);

  const fleetAlerts = buildFleetAlertsSummary(rows);

  return {
    kpi: {
      overallHealth,
      activeAlerts,
      criticalAlerts,
    },
    byVessel,
    fleetTimeline,
    fleetAlertDetails,
    fleetAlerts,
    meta: {
      rowCount: n,
      source: path.basename(CSV_PATH),
      dateFrom: fleetRows[0] ? String(fleetRows[0].DateTime).trim() : null,
      dateTo: fleetRows.length ? String(fleetRows[fleetRows.length - 1].DateTime).trim() : null,
    },
  };
}

const app = express();
app.disable('x-powered-by');
app.use(cors());

const ROOT_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fleet data API</title></head>
<body style="font-family:system-ui;padding:24px;max-width:640px">
  <h1>Fleet data API</h1>
  <p>JSON APIs for the fleet dashboard (CSV-backed metrics).</p>
  <ul>
    <li><a href="/api/health"><code>/api/health</code></a> or <a href="/health"><code>/health</code></a> — health check</li>
    <li><a href="/api/edp/dashboard"><code>/api/edp/dashboard</code></a> — EDP dashboard payload</li>
  </ul>
  <p>Open the UI: <strong>http://localhost:3000/fleet-health</strong> (run <code>npm start</code> in <code>daire_fleet_dashboard</code>).</p>
</body></html>`;

function sendRoot(_req, res) {
  res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(ROOT_HTML);
}

app.get('/', sendRoot);
app.get('/index.html', sendRoot);

function sendHealth(_req, res) {
  res.json({ ok: true, service: 'daire-fleet-csv-api' });
}

/** Top-level alias (plain Express “Cannot GET /health” means a different process is bound to this port). */
app.get('/health', sendHealth);

const api = express.Router();
api.get('/health', sendHealth);

api.get('/edp/dashboard', (_req, res) => {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      return res.status(404).json({
        error: 'EDP.csv not found',
        path: CSV_PATH,
      });
    }
    const text = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCsv(text);
    const payload = buildDashboard(rows);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Component API endpoints
api.get('/components',(_req, res) => {
  res.json(COMPONENTS.map(c => ({ id: c.id, name: c.name })));
});

api.get('/component/:componentId/data', (req, res) => {
  try {
    const { componentId } = req.params;
    const component = COMPONENTS.find(c => c.id === componentId);
    
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }
    
    const csvPath = path.join(__dirname, 'data', component.fileName);
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({
        error: 'Component data file not found',
        path: csvPath,
      });
    }
    
    const text = fs.readFileSync(csvPath, 'utf8');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ─── Beijing Maersk XLSX pipeline ─────────────────────────────────────────────

const XLSX = require('xlsx');
const XLSX_PATH = path.join(__dirname, 'data', 'Hermis SGM data April 2026 hourly.xlsx');
const BEIJING_IMO = 9984572;

const SENSOR_MAP = {
  61: 'shaft_rpm', 602: 'shaft_rpm_setpoint', 619: 'shaft_power_kw', 629: 'shaft_torque_knm',
  613: 'sg_power_kw', 3603: 'sg_actual_power_kw', 3604: 'sg_actual_frequency_hz',
  3605: 'sg_actual_current_a', 3606: 'sg_actual_voltage_v', 3607: 'sg_dc_voltage_v',
  615: 'sg_running_hours', 617: 'sg_energy_kwh', 1585: 'sg_available_power_pct',
  3601: 'sg_system_mode', 3602: 'sg_actual_speed_rpm',
  3608: 'sg_transformer_winding_1u_temp', 3609: 'sg_transformer_winding_1v_temp',
  3610: 'sg_transformer_winding_1w_temp', 3611: 'sg_transformer_winding_2u_temp',
  3612: 'sg_transformer_winding_2v_temp', 3613: 'sg_transformer_winding_2w_temp',
  3614: 'sg_reactor_winding_l1_1_temp', 3615: 'sg_reactor_winding_l1_2_temp',
  3616: 'sg_reactor_winding_l1_3_temp', 3617: 'sg_reactor_winding_l2_1_temp',
  3618: 'sg_reactor_winding_l2_2_temp', 3619: 'sg_reactor_winding_l2_3_temp',
  3622: 'sg_winding_u1_temp', 3623: 'sg_winding_v1_temp', 3624: 'sg_winding_w1_temp',
  3625: 'sg_winding_u2_temp', 3626: 'sg_winding_v2_temp', 3627: 'sg_winding_w2_temp',
  3628: 'sg_air_temp_hot1', 3629: 'sg_air_temp_cold1',
  3630: 'sg_air_temp_hot2', 3631: 'sg_air_temp_cold2',
  3632: 'sg_converter_coolant_temp',
};

const HEALTHY = {
  shaft_rpm: 67.8, sg_actual_power_kw: 1232.0, sg_actual_current_a: 1211.0,
  sg_actual_frequency_hz: 44.3, sg_actual_voltage_v: 518.0,
  shaft_torque_knm: 4160.0, shaft_power_kw: 29555.0,
  sg_winding_u1_temp: 47.8, sg_converter_coolant_temp: 35.0,
  sg_available_power_pct: 100.0,
};

const THRESHOLDS = {
  shaft_rpm:              [null, 30, null, null],
  shaft_power_kw:         [null, null, 35000, 40000],
  sg_actual_current_a:    [null, null, 1800, 2200],
  sg_actual_frequency_hz: [35, 55, null, 58],
  sg_winding_u1_temp:     [null, null, 80, 100],
  sg_winding_v1_temp:     [null, null, 80, 100],
  sg_winding_w1_temp:     [null, null, 80, 100],
  sg_converter_coolant_temp: [null, null, 55, 70],
};

function avg(vals) { return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; }
function stddev(vals) {
  if (vals.length < 2) return 0;
  const m = avg(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
}

function mechanicalPenalty(m) {
  const power = avg(m.shaft_power_kw || [HEALTHY.shaft_power_kw]);
  const torque = avg(m.shaft_torque_knm || [HEALTHY.shaft_torque_knm]);
  const rpm = avg(m.shaft_rpm || [HEALTHY.shaft_rpm]);
  if (rpm < 5) return 0;
  const expected = torque * rpm * (2 * Math.PI / 60) / 1000;
  if (expected < 1) return 0;
  const ratio = power / expected;
  const dev = Math.abs(ratio - 1.0);
  return Math.min(25, parseFloat((dev * 40).toFixed(4)));
}

function electricalPenalty(m) {
  const power = avg(m.sg_actual_power_kw || [0]);
  const current = avg(m.sg_actual_current_a || [0]);
  if (power < 50) return 0;
  const expectedCurrent = HEALTHY.sg_actual_current_a * (power / HEALTHY.sg_actual_power_kw);
  const excessPct = Math.max(0, (current - expectedCurrent) / Math.max(expectedCurrent, 1));
  return Math.min(20, parseFloat((excessPct * 60).toFixed(4)));
}

function thermalPenalty(m) {
  const checks = [
    ['sg_winding_u1_temp', 47.8, 80], ['sg_winding_v1_temp', 47.7, 80],
    ['sg_winding_w1_temp', 47.9, 80], ['sg_reactor_winding_l1_1_temp', 55.5, 85],
    ['sg_reactor_winding_l1_2_temp', 57.9, 85], ['sg_transformer_winding_2v_temp', 53.1, 80],
    ['sg_converter_coolant_temp', 35.0, 55],
  ];
  let maxP = 0;
  for (const [name, baseline, alarm] of checks) {
    const v = avg(m[name] || [baseline]);
    if (v > baseline) maxP = Math.max(maxP, (v - baseline) / Math.max(alarm - baseline, 1) * 20);
  }
  return Math.min(20, parseFloat(maxP.toFixed(4)));
}

function frequencyPenalty(m, freqHistory) {
  const power = avg(m.sg_actual_power_kw || [0]);
  if (power < 50) return 0;
  const sd = stddev(freqHistory || m.sg_actual_frequency_hz || [44.3]);
  return Math.min(15, parseFloat((sd * 5).toFixed(4)));
}

function mismatchPenalty(m) {
  const shaft = avg(m.shaft_rpm || [HEALTHY.shaft_rpm]);
  const sg = avg(m.sg_actual_speed_rpm || [HEALTHY.shaft_rpm]);
  const power = avg(m.sg_actual_power_kw || [0]);
  if (power < 50 || shaft < 5) return 0;
  const diffPct = Math.abs(shaft - sg) / Math.max(shaft, 1) * 100;
  return Math.min(10, parseFloat((diffPct * 2).toFixed(4)));
}

function loadingPenalty(m) {
  const actual = avg(m.sg_actual_power_kw || [HEALTHY.sg_actual_power_kw]);
  const available = avg(m.sg_available_power_pct || [HEALTHY.sg_available_power_pct]);
  if (actual < 50) return 0;
  const drop = Math.max(0, HEALTHY.sg_available_power_pct - available);
  return Math.min(10, parseFloat((drop * 0.25).toFixed(4)));
}

function computeHealth(m, freqHistory) {
  const mech = mechanicalPenalty(m);
  const elec = electricalPenalty(m);
  const therm = thermalPenalty(m);
  const freq = frequencyPenalty(m, freqHistory);
  const miss = mismatchPenalty(m);
  const load = loadingPenalty(m);
  const total = mech + elec + therm + freq + miss + load;
  return {
    health_score: parseFloat(Math.max(0, 100 - total).toFixed(2)),
    mechanical_contrib: mech, electrical_contrib: elec, thermal_contrib: therm,
    frequency_contrib: freq, mismatch_contrib: miss, loading_contrib: load,
  };
}

function generateAlerts(m, hour_ts) {
  const alerts = [];
  const checks = [
    ['shaft_rpm', 30, null, null, null],
    ['shaft_power_kw', null, null, 35000, 40000],
    ['sg_actual_current_a', null, null, 1800, 2200],
    ['sg_actual_frequency_hz', 35, 55, null, 58],
    ['sg_winding_u1_temp', null, null, 80, 100],
    ['sg_converter_coolant_temp', null, null, 55, 70],
  ];
  for (const [metric, lowW, highW, highC_warn, highC_crit] of checks) {
    const vals = m[metric];
    if (!vals || !vals.length) continue;
    const v = avg(vals);
    if (highC_crit != null && v > highC_crit) {
      alerts.push({ hour_ts, severity: 'CRITICAL', alert_type: 'THRESHOLD_HIGH_CRITICAL', metric_name: metric, metric_value: v, threshold_value: highC_crit, message: `${metric} critically high: ${v.toFixed(2)} > ${highC_crit}` });
    } else if (highC_warn != null && v > highC_warn) {
      alerts.push({ hour_ts, severity: 'WARNING', alert_type: 'THRESHOLD_HIGH_WARNING', metric_name: metric, metric_value: v, threshold_value: highC_warn, message: `${metric} above warning: ${v.toFixed(2)} > ${highC_warn}` });
    } else if (lowW != null && v < lowW) {
      alerts.push({ hour_ts, severity: 'WARNING', alert_type: 'THRESHOLD_LOW_WARNING', metric_name: metric, metric_value: v, threshold_value: lowW, message: `${metric} below minimum: ${v.toFixed(2)} < ${lowW}` });
    } else if (highW != null && v > highW) {
      alerts.push({ hour_ts, severity: 'WARNING', alert_type: 'THRESHOLD_HIGH_WARNING', metric_name: metric, metric_value: v, threshold_value: highW, message: `${metric} above warning: ${v.toFixed(2)} > ${highW}` });
    }
  }
  const elecPen = electricalPenalty(m);
  if (elecPen > 10) {
    alerts.push({ hour_ts, severity: elecPen > 15 ? 'CRITICAL' : 'WARNING', alert_type: 'ELECTRICAL_EFFICIENCY_LOSS', metric_name: 'sg_actual_current_a', metric_value: avg(m.sg_actual_current_a || [0]), threshold_value: 10, message: `Generator electrical efficiency degrading (penalty=${elecPen.toFixed(1)})` });
  }
  return alerts;
}

let _shipCache = null;
function loadShipData() {
  if (_shipCache) return _shipCache;
  if (!fs.existsSync(XLSX_PATH)) return null;

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null });

  // Filter Beijing Maersk, map sensor IDs
  const byHour = {};
  for (const row of raw) {
    const imo = Number(row.imo || row.IMO);
    if (imo !== BEIJING_IMO) continue;
    const sensorId = Number(row.sensor_id);
    const metricName = SENSOR_MAP[sensorId];
    if (!metricName) continue;
    const hourKey = String(row.hour_ts || '').trim();
    if (!hourKey) continue;
    if (!byHour[hourKey]) byHour[hourKey] = { hour_ts: hourKey, metrics: {} };
    const bucket = byHour[hourKey].metrics;
    if (!bucket[metricName]) bucket[metricName] = { avg: [], max: [], min: [] };
    const av = parseFloat(row.avg_value); if (!isNaN(av)) bucket[metricName].avg.push(av);
    const mx = parseFloat(row.max_value); if (!isNaN(mx)) bucket[metricName].max.push(mx);
    const mn = parseFloat(row.min_value); if (!isNaN(mn)) bucket[metricName].min.push(mn);
  }

  // Sort hours chronologically
  const hours = Object.values(byHour).sort((a, b) => a.hour_ts.localeCompare(b.hour_ts));

  // Build frequency history for stability penalty (rolling 12-hr window)
  const freqHistory = {};
  const freqWindow = [];
  for (const h of hours) {
    const fAvg = h.metrics.sg_actual_frequency_hz;
    if (fAvg && fAvg.avg.length) freqWindow.push(avg(fAvg.avg));
    freqHistory[h.hour_ts] = [...freqWindow.slice(-12)];
  }

  // Flatten metrics: use avg values as single-point lists (matching Flink window behavior)
  const hourly = hours.map((h) => {
    const m = {};
    for (const [name, vals] of Object.entries(h.metrics)) {
      m[name] = vals.avg;
    }
    const health = computeHealth(m, freqHistory[h.hour_ts]);
    const alerts = generateAlerts(m, h.hour_ts);

    // Key metrics snapshot
    const get = (name) => { const v = avg(m[name] || []); return isNaN(v) ? null : parseFloat(v.toFixed(3)); };
    return {
      hour_ts: h.hour_ts,
      health_score: health.health_score,
      mechanical_contrib: health.mechanical_contrib,
      electrical_contrib: health.electrical_contrib,
      thermal_contrib: health.thermal_contrib,
      frequency_contrib: health.frequency_contrib,
      mismatch_contrib: health.mismatch_contrib,
      loading_contrib: health.loading_contrib,
      alerts,
      // Key metrics
      shaft_rpm: get('shaft_rpm'),
      shaft_power_kw: get('shaft_power_kw'),
      shaft_torque_knm: get('shaft_torque_knm'),
      sg_actual_power_kw: get('sg_actual_power_kw'),
      sg_actual_frequency_hz: get('sg_actual_frequency_hz'),
      sg_actual_current_a: get('sg_actual_current_a'),
      sg_actual_voltage_v: get('sg_actual_voltage_v'),
      sg_actual_speed_rpm: get('sg_actual_speed_rpm'),
      sg_energy_kwh: get('sg_energy_kwh'),
      sg_running_hours: get('sg_running_hours'),
      sg_available_power_pct: get('sg_available_power_pct'),
      sg_system_mode: get('sg_system_mode'),
      // Thermal
      sg_winding_u1_temp: get('sg_winding_u1_temp'), sg_winding_v1_temp: get('sg_winding_v1_temp'),
      sg_winding_w1_temp: get('sg_winding_w1_temp'), sg_winding_u2_temp: get('sg_winding_u2_temp'),
      sg_winding_v2_temp: get('sg_winding_v2_temp'), sg_winding_w2_temp: get('sg_winding_w2_temp'),
      sg_reactor_winding_l1_1_temp: get('sg_reactor_winding_l1_1_temp'),
      sg_reactor_winding_l1_2_temp: get('sg_reactor_winding_l1_2_temp'),
      sg_transformer_winding_2v_temp: get('sg_transformer_winding_2v_temp'),
      sg_converter_coolant_temp: get('sg_converter_coolant_temp'),
      sg_air_temp_hot1: get('sg_air_temp_hot1'), sg_air_temp_cold1: get('sg_air_temp_cold1'),
    };
  });

  const allAlerts = hourly.flatMap((h) => h.alerts);
  const latestHour = hourly[hourly.length - 1] || {};
  const healthScores = hourly.map((h) => h.health_score).filter((v) => v != null);
  const overview = {
    ship_name: 'Beijing Maersk',
    imo: BEIJING_IMO,
    data_period: hourly.length ? `${hourly[0].hour_ts} – ${hourly[hourly.length - 1].hour_ts}` : 'N/A',
    total_hours: hourly.length,
    latest_health_score: latestHour.health_score ?? null,
    avg_health_score: healthScores.length ? parseFloat((avg(healthScores)).toFixed(2)) : null,
    min_health_score: healthScores.length ? parseFloat(Math.min(...healthScores).toFixed(2)) : null,
    total_alerts: allAlerts.length,
    critical_alerts: allAlerts.filter((a) => a.severity === 'CRITICAL').length,
    warning_alerts: allAlerts.filter((a) => a.severity === 'WARNING').length,
    latest_shaft_rpm: latestHour.shaft_rpm,
    latest_power_kw: latestHour.shaft_power_kw,
    latest_sg_power_kw: latestHour.sg_actual_power_kw,
    latest_frequency_hz: latestHour.sg_actual_frequency_hz,
    latest_current_a: latestHour.sg_actual_current_a,
    latest_running_hours: latestHour.sg_running_hours,
    latest_energy_kwh: latestHour.sg_energy_kwh,
  };

  _shipCache = { overview, hourly, allAlerts };
  return _shipCache;
}

api.get('/ship/data', (_req, res) => {
  try {
    const data = loadShipData();
    if (!data) return res.status(404).json({ error: 'XLSX file not found', path: XLSX_PATH });
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (e) {
    console.error('ship/data error:', e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ─── End Beijing Maersk pipeline ───────────────────────────────────────────────

app.use('/api', api);

app.use((req, res) => {
  res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body style="font-family:system-ui;padding:24px">
      <h1>404</h1>
      <p>No route for <code>${req.path}</code></p>
      <p><a href="/">Home</a> · <a href="/api/health">/api/health</a> · <a href="/api/edp/dashboard">/api/edp/dashboard</a></p>
    </body></html>`,
  );
});

// Export for Railway serverless and other serverless runtimes
module.exports = app;

// Start the server only when run directly (local dev)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('======== Fleet CSV backend ========');
    console.log(`  http://localhost:${PORT}/api/health`);
    console.log(`  http://localhost:${PORT}/api/edp/dashboard`);
    console.log(`  http://localhost:${PORT}/api/components`);
    console.log(`  http://localhost:${PORT}/api/component/engine-system/data`);
    console.log(`  CSV: ${CSV_PATH}`);
    console.log(`  Components: ${COMPONENTS.map(c => c.name).join(', ')}`);
    console.log('============================================');
    console.log('');
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        `\n[Fleet CSV backend] Port ${PORT} is already in use.\n` +
          `Fix: stop that PID or set PORT=5002.\n`,
      );
      process.exit(1);
    }
    throw err;
  });
}
