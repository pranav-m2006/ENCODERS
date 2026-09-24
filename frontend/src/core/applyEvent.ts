/**
 * Pure Event Apply Rules for FloodOps TypeScript Client.
 * Matches backend app/core/events.py 1:1 for deterministic client-side projection.
 */

export interface CampProjectionState {
  camp_id: string;
  capacity: number;
  occupied: number;
  reserved: number;
  projected: number;
  available: number;
  fill_band: 'GREEN' | 'AMBER' | 'RED';
  resources: Record<string, number>;
  version: number;
  alerts: Array<{ type: string; message: string; event_id?: string }>;
  arrived_groups: string[];
}

export function computeFillBand(occupied: number, capacity: number): 'GREEN' | 'AMBER' | 'RED' {
  if (capacity <= 0) return 'RED';
  const ratio = occupied / capacity;
  if (ratio < 0.70) return 'GREEN';
  if (ratio < 0.90) return 'AMBER';
  return 'RED';
}

export function applyEventToCampState(
  currentState: CampProjectionState,
  event: any,
  appliedEventIds: Set<string>
): {
  state: CampProjectionState;
  result: 'APPLIED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED';
  conflictType?: string;
  reason?: string;
} {
  const eventId = event.event_id;
  const eventType = event.type;
  const payload = event.payload || {};

  // 1. Idempotent check
  if (appliedEventIds.has(eventId)) {
    return { state: currentState, result: 'DUPLICATE', reason: 'Event already applied' };
  }

  const newState: CampProjectionState = {
    ...currentState,
    resources: { ...(currentState.resources || {}) },
    alerts: [...(currentState.alerts || [])],
    arrived_groups: [...(currentState.arrived_groups || [])]
  };

  const capacity = newState.capacity || 1000;
  const occupied = newState.occupied || 0;
  const reserved = newState.reserved || 0;

  if (eventType === 'CAMP_ARRIVAL') {
    const count = Number(payload.count || 0);
    const newOccupied = occupied + count;
    newState.occupied = newOccupied;
    newState.projected = newOccupied + reserved;
    newState.available = Math.max(0, capacity - newState.projected);
    newState.fill_band = computeFillBand(newOccupied, capacity);

    if (newOccupied > capacity) {
      newState.alerts.push({
        type: 'OVERCAPACITY',
        message: `Camp occupancy ${newOccupied} exceeds capacity ${capacity} by ${newOccupied - capacity}`,
        event_id: eventId
      });
    }
    return { state: newState, result: 'APPLIED' };
  }

  if (eventType === 'CAMP_DEPARTURE') {
    const count = Number(payload.count || 0);
    const newOccupied = occupied - count;
    if (newOccupied < 0) {
      return {
        state: currentState,
        result: 'CONFLICT',
        conflictType: 'NEGATIVE_OCCUPANCY',
        reason: `Departure of ${count} exceeds current occupancy ${occupied}`
      };
    }
    newState.occupied = newOccupied;
    newState.projected = newOccupied + reserved;
    newState.available = Math.max(0, capacity - newState.projected);
    newState.fill_band = computeFillBand(newOccupied, capacity);
    return { state: newState, result: 'APPLIED' };
  }

  if (eventType === 'GROUP_ASSIGNED') {
    const count = Number(payload.count || 0);
    const newReserved = reserved + count;
    newState.reserved = newReserved;
    newState.projected = occupied + newReserved;
    newState.available = Math.max(0, capacity - newState.projected);
    newState.fill_band = computeFillBand(occupied, capacity);
    return { state: newState, result: 'APPLIED' };
  }

  if (eventType === 'GROUP_ARRIVED') {
    const count = Number(payload.count || 0);
    const groupId = payload.group_id;
    if (groupId && newState.arrived_groups.includes(groupId)) {
      return {
        state: currentState,
        result: 'CONFLICT',
        conflictType: 'DOUBLE_ARRIVAL',
        reason: `Group ${groupId} already recorded arrived`
      };
    }

    const newReserved = Math.max(0, reserved - count);
    const newOccupied = occupied + count;
    newState.reserved = newReserved;
    newState.occupied = newOccupied;
    newState.projected = newOccupied + newReserved;
    newState.available = Math.max(0, capacity - newState.projected);
    newState.fill_band = computeFillBand(newOccupied, capacity);
    if (groupId) {
      newState.arrived_groups.push(groupId);
    }
    return { state: newState, result: 'APPLIED' };
  }

  if (eventType === 'RESOURCE_STOCKTAKE') {
    const baseVersion = event.base_version;
    const currentVersion = newState.version || 0;
    if (baseVersion !== undefined && baseVersion !== null && baseVersion !== currentVersion) {
      return {
        state: currentState,
        result: 'CONFLICT',
        conflictType: 'STOCKTAKE_MISMATCH',
        reason: `Expected base version ${currentVersion}, got ${baseVersion}`
      };
    }
    newState.resources = { ...(payload.resources || {}) };
    newState.version = currentVersion + 1;
    return { state: newState, result: 'APPLIED' };
  }

  return { state: newState, result: 'APPLIED' };
}
