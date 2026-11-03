/**
 * data/portfolio.js
 *
 * Fleet -> Vessel -> System -> Parameter model used by the Asset Management UI.
 * Beijing Maersk is built from real sensor data (public/data/shipData.json);
 * every other vessel is deterministic demo data generated from a fixed seed so
 * the demo always shows the same populated states.
 */

export const HEALTH_THRESHOLDS = { healthy: 80, warning: 60 };
export const statusOf = (health) =>
  health >= HEALTH_THRESHOLDS.healthy ? 'healthy' : health >= HEALTH_THRESHOLDS.warning ? 'warning' : 'critical';
export const STATUS_RANK = { healthy: 0, warning: 1, critical: 2 };
export const STATUS_LABEL = { healthy: 'Healthy', warning: 'Warning', critical: 'Critical' };

const DAY = 86400000;
const TREND_DAYS = 30;

/* ── seeded randomness ───────────────────────────────────────────────── */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seedStr) {
  let a = hashSeed(seedStr);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;
const smooth = (x) => x * x * (3 - 2 * x);

/* ── system / parameter templates (demo vessels) ─────────────────────── */
const SYSTEM_TEMPLATES = {
  engine: {
    name: 'Engine System',
    params: [
      { id: 'exhaust-temp', name: 'Exhaust Gas Temperature', unit: '°C', base: 410, dir: 1, action: 'Inspect fuel injectors and the turbocharger, then verify the exhaust temperature sensors.' },
      { id: 'bearing-vibration', name: 'Main Bearing Vibration', unit: 'mm/s', base: 3.2, dir: 1, action: 'Inspect main bearings and check shaft alignment.' },
      { id: 'rpm-deviation', name: 'RPM Deviation', unit: '%', base: 1.0, dir: 1, action: 'Check the governor and fuel-rack settings against set-point.' },
      { id: 'lube-pressure', name: 'Lube Oil Pressure', unit: 'bar', base: 4.5, dir: -1, action: 'Replace lube oil filters and inspect the oil pump.' },
    ],
  },
  cooling: {
    name: 'Cooling System',
    params: [
      { id: 'coolant-temp', name: 'Converter Coolant Temperature', unit: '°C', base: 35, dir: 1, action: 'Inspect the cooling system and verify the converter coolant-temperature sensor.' },
      { id: 'inlet-temp', name: 'Inlet Temperature', unit: '°C', base: 28, dir: 1, action: 'Clean the heat exchanger and check the seawater inlet strainer.' },
      { id: 'coolant-flow', name: 'Coolant Flow Rate', unit: 'm³/h', base: 120, dir: -1, action: 'Inspect the coolant pump and clear flow restrictions.' },
      { id: 'pump-vibration', name: 'Pump Vibration', unit: 'mm/s', base: 2.1, dir: 1, action: 'Check the pump bearings and coupling alignment.' },
    ],
  },
  electrical: {
    name: 'Electrical System',
    params: [
      { id: 'gen-current', name: 'Generator Current', unit: 'A', base: 1200, dir: 1, action: 'Inspect generator connections and check load sharing.' },
      { id: 'winding-temp', name: 'Winding Temperature', unit: '°C', base: 48, dir: 1, action: 'Clean winding cooling paths and verify the winding temperature sensors.' },
      { id: 'voltage-deviation', name: 'Voltage Deviation', unit: '%', base: 0.8, dir: 1, action: 'Recalibrate the automatic voltage regulator.' },
      { id: 'frequency-stability', name: 'Frequency Stability', unit: 'Hz', base: 0.15, dir: 1, action: 'Calibrate the frequency regulator and review governor response.' },
    ],
  },
};
const SYSTEM_ORDER = ['engine', 'cooling', 'electrical'];

/* ── demo vessel roster ──────────────────────────────────────────────── */
// issue: which system is degrading, how badly, and which parameter drives it
const DEMO_FLEETS = [
  {
    id: 'fleet-asia-europe', name: 'Fleet Asia–Europe', region: 'Asia–Europe',
    vessels: [
      { id: 'beijing-maersk', name: 'Beijing Maersk', real: true },
      { id: 'orient-gale', name: 'MV Orient Gale', issue: null },
      { id: 'silk-route', name: 'MV Silk Route', issue: { system: 'cooling', level: 'warning', driver: 1 }, scheduledInDays: 6 },
    ],
  },
  {
    id: 'fleet-atlantic', name: 'Fleet Atlantic', region: 'North Atlantic',
    vessels: [
      { id: 'coastal-star', name: 'MV Coastal Star', issue: { system: 'engine', level: 'critical', driver: 0 } },
      { id: 'atlantic-dawn', name: 'MV Atlantic Dawn', issue: null },
      { id: 'ocean-prince', name: 'MV Ocean Prince', issue: { system: 'electrical', level: 'warning', driver: 1 }, scheduledInDays: 12 },
      { id: 'northern-light', name: 'MV Northern Light', issue: null },
    ],
  },
  {
    id: 'fleet-pacific', name: 'Fleet Pacific', region: 'South Pacific',
    vessels: [
      { id: 'pacific-explorer', name: 'MV Pacific Explorer', issue: null },
      { id: 'island-trader', name: 'MV Island Trader', issue: null },
      { id: 'coral-spirit', name: 'MV Coral Spirit', issue: null, noData: ['electrical'] },
      { id: 'pacific-dawn', name: 'MV Pacific Dawn', issue: null },
    ],
  },
  {
    id: 'fleet-mediterranean', name: 'Fleet Mediterranean', region: 'Mediterranean Sea',
    vessels: [
      { id: 'adriatic-wind', name: 'MV Adriatic Wind', issue: { system: 'engine', level: 'warning', driver: 1 } },
      { id: 'aegean-star', name: 'MV Aegean Star', issue: null },
      { id: 'ligurian-sun', name: 'MV Ligurian Sun', issue: null },
    ],
  },
];

/* Recently resolved maintenance events (days before the data cut-off date). */
const RESOLVED_EVENTS = [
  { daysAgo: 2, fleet: 'Fleet Atlantic', vessel: 'MV Atlantic Dawn', system: 'Cooling System', issue: 'Coolant pump vibration above limit', status: 'Resolved' },
  { daysAgo: 5, fleet: 'Fleet Pacific', vessel: 'MV Coral Spirit', system: 'Engine System', issue: 'Exhaust gas temperature drift', status: 'Verified' },
  { daysAgo: 9, fleet: 'Fleet Mediterranean', vessel: 'MV Aegean Star', system: 'Electrical System', issue: 'Voltage regulator deviation', status: 'Resolved' },
  { daysAgo: 12, fleet: 'Fleet Asia–Europe', vessel: 'MV Orient Gale', system: 'Cooling System', issue: 'Inlet temperature sensor fault', status: 'Monitoring' },
  { daysAgo: 16, fleet: 'Fleet Atlantic', vessel: 'MV Ocean Prince', system: 'Engine System', issue: 'Low lube oil pressure', status: 'Verified' },
  { daysAgo: 21, fleet: 'Fleet Pacific', vessel: 'MV Island Trader', system: 'Electrical System', issue: 'Generator current imbalance', status: 'Resolved' },
  { daysAgo: 27, fleet: 'Fleet Mediterranean', vessel: 'MV Adriatic Wind', system: 'Cooling System', issue: 'Reduced coolant flow', status: 'Resolved' },
  { daysAgo: 34, fleet: 'Fleet Asia–Europe', vessel: 'MV Silk Route', system: 'Engine System', issue: 'RPM deviation from set-point', status: 'Verified' },
  { daysAgo: 48, fleet: 'Fleet Atlantic', vessel: 'MV Northern Light', system: 'Electrical System', issue: 'Winding temperature rise', status: 'Resolved' },
  { daysAgo: 63, fleet: 'Fleet Pacific', vessel: 'MV Pacific Dawn', system: 'Cooling System', issue: 'Heat exchanger fouling', status: 'Resolved' },
  { daysAgo: 75, fleet: 'Fleet Mediterranean', vessel: 'MV Ligurian Sun', system: 'Engine System', issue: 'Main bearing vibration', status: 'Verified' },
  { daysAgo: 82, fleet: 'Fleet Asia–Europe', vessel: 'Beijing Maersk', system: 'Shaft Generator', issue: 'Frequency excursions at low load', status: 'Resolved' },
];

/* ── helpers to build health series ──────────────────────────────────── */
function buildDates(anchorMs, n) {
  return Array.from({ length: n }, (_, i) => anchorMs - (n - 1 - i) * DAY);
}

function paramStatus(devPct) {
  return devPct < 8 ? 'healthy' : devPct < 20 ? 'warning' : 'critical';
}

function finishSystem(sys) {
  const latest = sys.trend[sys.trend.length - 1]?.value;
  sys.health = latest == null ? null : Math.round(latest);
  sys.status = sys.health == null ? 'nodata' : statusOf(sys.health);
  return sys;
}

function buildDemoSystem({ vessel, key, dates, rand }) {
  const tpl = SYSTEM_TEMPLATES[key];
  const issue = vessel.issue && vessel.issue.system === key ? vessel.issue : null;
  const sysId = key;

  if ((vessel.noData || []).includes(key)) {
    return { id: sysId, name: tpl.name, connected: false, trend: [], parameters: [], health: null, status: 'nodata', contribution: 0 };
  }

  let healthEnd;
  if (issue) healthEnd = issue.level === 'critical' ? 36 + rand() * 14 : 64 + rand() * 8;
  else healthEnd = 87 + rand() * 9;
  const healthStart = 92 + rand() * 5;
  const declineStart = 0.35 + rand() * 0.2;

  const progress = dates.map((_, i) => {
    const x = i / (dates.length - 1);
    return issue ? smooth(clamp((x - declineStart) / (1 - declineStart), 0, 1)) : x * 0.15;
  });

  const trend = dates.map((t, i) => ({
    t,
    value: round1(clamp(healthStart + (healthEnd - healthStart) * progress[i] + (rand() - 0.5) * 2.4, 5, 100)),
  }));

  // Pin the final point so the current status matches the intended scenario
  trend[trend.length - 1].value = round1(healthEnd);

  const degradation = (healthStart - healthEnd) / 100; // 0..0.6
  const driver = issue ? issue.driver : -1;
  const weights = tpl.params.map((_, idx) => {
    if (!issue) return 0.12 + rand() * 0.1;
    const dist = (idx - driver + tpl.params.length) % tpl.params.length;
    return [1, 0.5, 0.28, 0.14][dist];
  });

  const parameters = tpl.params.map((p, idx) => {
    const devEnd = Math.max(0.6, degradation * 55 * weights[idx] + rand() * 1.5);
    const series = dates.map((t, i) => {
      const dev = (devEnd * progress[i] + (rand() - 0.5) * devEnd * 0.12) / 100;
      const noise = (rand() - 0.5) * 0.012;
      return { t, value: Math.round(p.base * (1 + p.dir * dev + noise) * 100) / 100 };
    });
    const current = series[series.length - 1].value;
    const deviation = Math.abs(((current - p.base) / p.base) * 100);
    return {
      id: p.id, name: p.name, unit: p.unit, baseline: p.base, series, current,
      deviation: round1(deviation), status: paramStatus(deviation), action: p.action,
    };
  });

  return finishSystem({ id: sysId, name: tpl.name, connected: true, trend, parameters });
}

function rankContributions(systems) {
  const connected = systems.filter((s) => s.connected !== false && s.health != null);
  const totalLoss = connected.reduce((s, x) => s + (100 - x.health), 0) || 1;
  systems.forEach((s) => {
    s.contribution = s.connected !== false && s.health != null ? Math.round(((100 - s.health) / totalLoss) * 100) : 0;
    const totalDev = s.parameters.reduce((a, p) => a + p.deviation, 0) || 1;
    s.parameters.forEach((p) => { p.contribution = Math.round((p.deviation / totalDev) * 100); });
    s.parameters.sort((a, b) => b.deviation - a.deviation);
  });
  systems.sort((a, b) => (a.connected === false) - (b.connected === false) || b.contribution - a.contribution);
  return systems;
}

export function recommendationFor(vessel, worst, anchorMs) {
  if (!worst || worst.status === 'healthy' || worst.status === 'nodata') {
    return {
      priority: 'Low', withinDays: 60, systemId: worst ? worst.id : null,
      action: 'No corrective action required. Continue routine inspection at the next planned interval.',
      reason: 'All connected systems are within normal operating range.',
      affected: vessel.name,
    };
  }
  const driver = worst.parameters[0];
  const priority = worst.status === 'critical' ? 'Critical' : worst.health < 68 ? 'High' : 'Medium';
  const withinDays = priority === 'Critical' ? 3 : priority === 'High' ? 7 : 14;
  const overBy = driver ? `${driver.name} is ${driver.deviation}% ${driver.current >= driver.baseline ? 'above' : 'below'} its normal baseline.` : 'System health is below the normal range.';
  return {
    priority, withinDays, systemId: worst.id,
    action: driver ? driver.action : 'Inspect the affected system.',
    reason: overBy,
    affected: `${vessel.name} · ${worst.name}`,
    dueBy: anchorMs + withinDays * DAY,
  };
}

/* ── Beijing Maersk (real data) ──────────────────────────────────────── */
function dailyAverages(hourly, keys) {
  const byDay = new Map();
  hourly.forEach((h) => {
    const day = h.hour_ts.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(h);
  });
  return [...byDay.entries()].map(([day, rows]) => {
    const out = { t: Date.parse(`${day}T12:00:00Z`) };
    keys.forEach((k) => {
      const vals = rows.map((r) => r[k]).filter((v) => v != null);
      out[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    return out;
  });
}

const BEIJING_PARAMS = {
  'main-engine': [
    { key: 'shaft_rpm', name: 'Shaft Speed', unit: 'rpm', base: 67.8, dir: 1, action: 'Compare shaft power against torque × speed and verify the shaft power and torque sensors.' },
    { key: 'shaft_power_kw', name: 'Shaft Power', unit: 'kW', base: 29555, dir: 1, action: 'Verify the shaft power measurement and check propeller load conditions.' },
    { key: 'shaft_torque_knm', name: 'Shaft Torque', unit: 'kNm', base: 4160, dir: 1, action: 'Verify torque measurement and inspect shaft coupling and bearings.' },
  ],
  'shaft-generator': [
    { key: 'sg_actual_current_a', name: 'Generator Current', unit: 'A', base: 1211, dir: 1, action: 'Inspect generator electrical connections and review load sharing.' },
    { key: 'sg_actual_frequency_hz', name: 'Output Frequency', unit: 'Hz', base: 44.3, dir: 1, action: 'Calibrate the frequency regulator.' },
    { key: 'sg_actual_voltage_v', name: 'Output Voltage', unit: 'V', base: 518, dir: 1, action: 'Check the voltage regulator and output cabling.' },
  ],
  'generator-windings': [
    { key: 'sg_winding_u1_temp', name: 'Winding U1 Temperature', unit: '°C', base: 47.8, dir: 1, action: 'Clean winding cooling paths and verify the temperature sensor.' },
    { key: 'sg_winding_v1_temp', name: 'Winding V1 Temperature', unit: '°C', base: 47.7, dir: 1, action: 'Clean winding cooling paths and verify the temperature sensor.' },
    { key: 'sg_winding_w1_temp', name: 'Winding W1 Temperature', unit: '°C', base: 47.9, dir: 1, action: 'Clean winding cooling paths and verify the temperature sensor.' },
  ],
  transformer: [
    { key: 'sg_transformer_winding_2v_temp', name: 'Transformer Winding 2V Temperature', unit: '°C', base: 53.1, dir: 1, action: 'Inspect transformer cooling and verify the winding temperature sensor.' },
  ],
  reactor: [
    { key: 'sg_reactor_winding_l1_1_temp', name: 'Reactor Winding L1-1 Temperature', unit: '°C', base: 55.5, dir: 1, action: 'Inspect reactor airflow and verify the winding temperature sensor.' },
    { key: 'sg_reactor_winding_l1_2_temp', name: 'Reactor Winding L1-2 Temperature', unit: '°C', base: 57.9, dir: 1, action: 'Inspect reactor airflow and verify the winding temperature sensor.' },
  ],
  cooling: [
    { key: 'sg_converter_coolant_temp', name: 'Converter Coolant Temperature', unit: '°C', base: 35, dir: 1, action: 'Inspect the cooling system and verify the converter coolant-temperature sensor.' },
    { key: 'sg_air_temp_hot1', name: 'Hot Air Temperature', unit: '°C', base: 55, dir: 1, action: 'Inspect cooling air paths and clean the heat exchanger.' },
    { key: 'sg_air_temp_cold1', name: 'Inlet Air Temperature', unit: '°C', base: 28, dir: 1, action: 'Check cooling air inlet and filters.' },
  ],
};
const BEIJING_SYSTEM_NAMES = {
  'main-engine': 'Main Engine', 'shaft-generator': 'Shaft Generator', 'generator-windings': 'Generator Windings',
  transformer: 'Transformer', reactor: 'Reactor', cooling: 'Cooling System',
};
// Health = 100 minus the penalty points that component contributes to the vessel health score
const BEIJING_PENALTY = {
  'main-engine': (d) => d.mechanical_contrib,
  'shaft-generator': (d) => (d.electrical_contrib ?? 0) + (d.frequency_contrib ?? 0) + (d.mismatch_contrib ?? 0) + (d.loading_contrib ?? 0),
};
const BEIJING_THERMAL = {
  'generator-windings': [['sg_winding_u1_temp', 47.8, 80], ['sg_winding_v1_temp', 47.7, 80], ['sg_winding_w1_temp', 47.9, 80]],
  transformer: [['sg_transformer_winding_2v_temp', 53.1, 80]],
  reactor: [['sg_reactor_winding_l1_1_temp', 55.5, 85], ['sg_reactor_winding_l1_2_temp', 57.9, 85]],
  cooling: [['sg_converter_coolant_temp', 35, 55]],
};

function buildBeijing(shipData, vesselMeta) {
  const hourly = shipData.hourly || [];
  const allKeys = new Set(['health_score', 'mechanical_contrib', 'electrical_contrib', 'frequency_contrib', 'mismatch_contrib', 'loading_contrib']);
  Object.values(BEIJING_PARAMS).flat().forEach((p) => allKeys.add(p.key));
  Object.values(BEIJING_THERMAL).flat().forEach(([k]) => allKeys.add(k));
  const daily = dailyAverages(hourly, [...allKeys]).slice(-TREND_DAYS);

  const systems = Object.keys(BEIJING_SYSTEM_NAMES).map((id) => {
    let trend;
    if (BEIJING_PENALTY[id]) {
      trend = daily.map((d) => ({ t: d.t, value: round1(clamp(100 - BEIJING_PENALTY[id](d), 0, 100)) }));
    } else {
      trend = daily.map((d) => {
        const ratio = Math.max(0, ...BEIJING_THERMAL[id].map(([k, base, alarm]) => ((d[k] ?? base) - base) / (alarm - base)));
        return { t: d.t, value: round1(clamp(100 - ratio * 100, 0, 100)) };
      });
    }
    const parameters = BEIJING_PARAMS[id].map((p) => {
      const series = daily.map((d) => ({ t: d.t, value: round1(d[p.key] ?? p.base) }));
      const last7 = series.slice(-7).map((s) => s.value);
      const current = round1(last7.reduce((a, b) => a + b, 0) / last7.length);
      const deviation = round1(Math.abs(((current - p.base) / p.base) * 100));
      return { id: p.key, name: p.name, unit: p.unit, baseline: p.base, series, current, deviation, status: paramStatus(deviation), action: p.action };
    });
    return finishSystem({ id, name: BEIJING_SYSTEM_NAMES[id], connected: true, trend, parameters });
  });

  const vesselTrend = daily.map((d) => ({ t: d.t, value: round1(d.health_score ?? 0) }));
  return { systems, vesselTrend, anchorMs: daily[daily.length - 1]?.t ?? Date.now(), vesselMeta };
}

/* ── public builder ──────────────────────────────────────────────────── */
export function buildPortfolio(shipData) {
  const beijing = buildBeijing(shipData, null);
  const anchorMs = beijing.anchorMs;
  const dates = buildDates(anchorMs, TREND_DAYS);

  const fleets = DEMO_FLEETS.map((f) => {
    const vessels = f.vessels.map((v) => {
      let systems;
      let trend;
      if (v.real) {
        systems = beijing.systems;
        trend = beijing.vesselTrend;
      } else {
        const rand = rng(v.id);
        systems = SYSTEM_ORDER.map((key) => buildDemoSystem({ vessel: v, key, dates, rand }));
        const live = systems.filter((s) => s.connected !== false);
        // Weakest system is weighted more heavily so one failing system is not averaged away
        trend = dates.map((t, i) => {
          const vals = live.map((s) => s.trend[i].value);
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          return { t, value: round1(0.6 * Math.min(...vals) + 0.4 * mean) };
        });
      }
      systems = rankContributions(systems);
      const live = systems.filter((s) => s.connected !== false && s.health != null);
      const worst = [...live].sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.health - b.health)[0];
      const health = Math.round(trend[trend.length - 1].value);
      const status = worst ? worst.status : statusOf(health);
      return {
        id: v.id, name: v.name, fleetId: f.id, fleetName: f.name, real: !!v.real,
        systems, trend, health, status,
        worstSystemId: worst?.id ?? systems[0].id,
        recommendation: recommendationFor(v, worst, anchorMs),
        defaultSchedule: v.scheduledInDays ? anchorMs + v.scheduledInDays * DAY : null,
      };
    });
    const counts = { healthy: 0, warning: 0, critical: 0 };
    vessels.forEach((v) => { counts[v.status] += 1; });
    const attention = [...vessels]
      .filter((v) => v.status !== 'healthy')
      .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.health - b.health)[0] || null;
    return {
      id: f.id, name: f.name, region: f.region, vessels, counts,
      health: Math.round(vessels.reduce((a, v) => a + v.health, 0) / vessels.length),
      requirements: counts.warning + counts.critical,
      topIssue: attention,
    };
  });

  const events = RESOLVED_EVENTS.map((e) => ({ ...e, resolvedMs: anchorMs - e.daysAgo * DAY }));
  return { fleets, events, anchorMs, trendDays: TREND_DAYS };
}

export const PERIODS = [
  { id: '7d', label: 'Last 7 days', short: '7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', short: '30 days', days: 30 },
  { id: '3m', label: 'Last 3 months', short: '3 months', days: 90 },
];

export function formatDate(ms, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(ms).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
}
