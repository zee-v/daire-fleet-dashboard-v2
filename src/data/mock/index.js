/**
 * data/mock/index.js  —  Master data barrel
 *
 * Assembles all fleet / vessel / system / schedule / KPI mock data
 * into a single queryable store consumed by the service layer.
 *
 * MIGRATION NOTE: When real APIs are available, replace this barrel
 * with async functions in the service layer. No UI code should change.
 */

// ── Fleets ─────────────────────────────────────────────────────────────────
import { FLEET_ATLANTIC }       from './fleets/fleet-atlantic';
import { FLEET_PACIFIC }        from './fleets/fleet-pacific';
import { FLEET_MEDITERRANEAN }  from './fleets/fleet-mediterranean';
import { FLEET_BEIJING_MAERSK } from './fleets/fleet-beijing-maersk';

// ── Vessels ────────────────────────────────────────────────────────────────
import { VESSEL_A } from './vessels/vessel-a';
import { VESSEL_B } from './vessels/vessel-b';
import { VESSEL_C } from './vessels/vessel-c';
import { VESSEL_D } from './vessels/vessel-d';
import { VESSEL_E } from './vessels/vessel-e';
import { VESSEL_F } from './vessels/vessel-f';
import { VESSEL_G } from './vessels/vessel-g';
import { VESSEL_H } from './vessels/vessel-h';
import { VESSEL_I } from './vessels/vessel-i';
import { VESSEL_J } from './vessels/vessel-j';
import { VESSEL_K } from './vessels/vessel-k';

// ── Systems ────────────────────────────────────────────────────────────────
import { ALL_SYSTEMS } from './systems/systems';

// ── Schedules / KPIs / Alerts ──────────────────────────────────────────────
export { SCHEDULE, SCHEDULE_WEEKS, SCHEDULE_SLOTS,
  MAINTENANCE_WINDOWS, MAINTENANCE_TEAMS, PRIORITIES,
  IMPACT_SUMMARY } from './schedules/maintenanceSchedule';

export { FLEET_KPIS, FLEET_ALERTS_SUMMARY } from './kpis/dashboardKpis';
export { CORRECTIVE_ACTIONS } from './alerts/correctiveActions';
export { ALL_SYSTEMS };

// ── Queryable maps (O(1) lookup) ───────────────────────────────────────────

/** @type {Record<string, import('../../types/index').Fleet>} */
export const FLEET_MAP = {
  [FLEET_BEIJING_MAERSK.id]: FLEET_BEIJING_MAERSK,
  [FLEET_ATLANTIC.id]:       FLEET_ATLANTIC,
  [FLEET_PACIFIC.id]:        FLEET_PACIFIC,
  [FLEET_MEDITERRANEAN.id]:  FLEET_MEDITERRANEAN,
};

/** Ordered list for sidebar rendering */
export const ALL_FLEETS = [FLEET_BEIJING_MAERSK, FLEET_ATLANTIC, FLEET_PACIFIC, FLEET_MEDITERRANEAN];

/** @type {Record<string, import('../../types/index').Vessel>} */
export const VESSEL_MAP = {
  [VESSEL_A.id]: VESSEL_A,
  [VESSEL_B.id]: VESSEL_B,
  [VESSEL_C.id]: VESSEL_C,
  [VESSEL_D.id]: VESSEL_D,
  [VESSEL_E.id]: VESSEL_E,
  [VESSEL_F.id]: VESSEL_F,
  [VESSEL_G.id]: VESSEL_G,
  [VESSEL_H.id]: VESSEL_H,
  [VESSEL_I.id]: VESSEL_I,
  [VESSEL_J.id]: VESSEL_J,
  [VESSEL_K.id]: VESSEL_K,
};

/** Convenience: ordered list of all vessels */
export const ALL_VESSELS = [
  VESSEL_A, VESSEL_B, VESSEL_C, VESSEL_D,
  VESSEL_E, VESSEL_F, VESSEL_G, VESSEL_H,
  VESSEL_I, VESSEL_J, VESSEL_K,
];
