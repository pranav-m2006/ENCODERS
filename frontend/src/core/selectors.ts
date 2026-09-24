/**
 * Shared Selectors for FloodOps.
 * Single source of truth: Local State = Server Snapshot + Pending Outbox Events.
 * No page computes its own numbers.
 */
import { applyEventToCampState, CampProjectionState } from './applyEvent';
import { StoredEvent, StoredSnapshot } from './db';

export interface DashboardMetrics {
  totalOccupied: number;
  totalCapacity: number;
  totalReserved: number;
  totalAvailable: number;
  groupsInTransit: number;
  pendingSyncCount: number;
  unresolvedConflicts: number;
}

export function selectCamps(
  snapshot: StoredSnapshot | null,
  outboxEvents: StoredEvent[]
): Record<string, CampProjectionState> {
  const camps: Record<string, CampProjectionState> = {};

  // 1. Initialize from snapshot
  if (snapshot && snapshot.camps) {
    for (const [id, c] of Object.entries(snapshot.camps)) {
      camps[id] = {
        camp_id: id,
        capacity: c.capacity || 1000,
        occupied: c.occupied || 0,
        reserved: c.reserved || 0,
        projected: c.projected || c.occupied || 0,
        available: c.available ?? Math.max(0, (c.capacity || 1000) - (c.occupied || 0)),
        fill_band: c.fill_band || 'GREEN',
        resources: c.resources || { water_l: 15000, food_meals: 3000 },
        version: c.version || 1,
        alerts: [],
        arrived_groups: []
      };
    }
  }

  // 2. Apply pending outbox events on top
  const appliedIds = new Set<string>();
  for (const evt of outboxEvents) {
    const campId = evt.entity_id;
    if (camps[campId]) {
      const res = applyEventToCampState(camps[campId], evt, appliedIds);
      camps[campId] = res.state;
      if (res.result === 'APPLIED') {
        appliedIds.add(evt.event_id);
      }
    }
  }

  return camps;
}

export function selectDashboardMetrics(
  camps: Record<string, CampProjectionState>,
  outboxEvents: StoredEvent[],
  conflictCount: number = 0
): DashboardMetrics {
  let totalOccupied = 0;
  let totalCapacity = 0;
  let totalReserved = 0;
  let totalAvailable = 0;

  for (const c of Object.values(camps)) {
    totalOccupied += c.occupied;
    totalCapacity += c.capacity;
    totalReserved += c.reserved;
    totalAvailable += c.available;
  }

  return {
    totalOccupied,
    totalCapacity,
    totalReserved,
    totalAvailable,
    groupsInTransit: outboxEvents.filter(e => e.type === 'GROUP_ASSIGNED' || e.type === 'GROUP_IN_TRANSIT').length,
    pendingSyncCount: outboxEvents.length,
    unresolvedConflicts: conflictCount
  };
}
