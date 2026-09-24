import { create } from 'zustand';
import { db, StoredEvent, StoredSnapshot } from '../core/db';
import { selectCamps, selectDashboardMetrics } from '../core/selectors';
import { CampProjectionState } from '../core/applyEvent';
import { syncEngine, ConnectionState } from '../core/sync';

interface LocalOpsState {
  snapshot: StoredSnapshot | null;
  outbox: StoredEvent[];
  camps: Record<string, CampProjectionState>;
  metrics: {
    totalOccupied: number;
    totalCapacity: number;
    totalReserved: number;
    totalAvailable: number;
    groupsInTransit: number;
    pendingSyncCount: number;
    unresolvedConflicts: number;
  };
  connectionState: ConnectionState;
  lastEventRecordedAt: number | null;
  lastCompensatingEvent: StoredEvent | null;
  canUndo: boolean;

  // Actions
  init: () => Promise<void>;
  recordArrival: (campId: string, count: number, groupId?: string) => Promise<boolean>;
  recordDeparture: (campId: string, count: number) => Promise<{ success: boolean; error?: string }>;
  undoLastAction: () => Promise<boolean>;
  triggerSync: () => Promise<void>;
  toggleSimulatedOffline: (val: boolean) => void;
}

export const useLocalOpsStore = create<LocalOpsState>((set, get) => ({
  snapshot: null,
  outbox: [],
  camps: {},
  metrics: {
    totalOccupied: 0,
    totalCapacity: 0,
    totalReserved: 0,
    totalAvailable: 0,
    groupsInTransit: 0,
    pendingSyncCount: 0,
    unresolvedConflicts: 0
  },
  connectionState: 'ONLINE',
  lastEventRecordedAt: null,
  lastCompensatingEvent: null,
  canUndo: false,

  init: async () => {
    // 1. Load initial snapshot from Dexie
    let snap = (await db.snapshot.get('latest')) || null;
    if (!snap) {
      // Seed fallback snapshot for instantaneous offline startup
      snap = {
        id: 'latest',
        camps: {
          camp_A: { camp_id: 'camp_A', name: 'Central School', capacity: 1000, occupied: 700, reserved: 0, fill_band: 'AMBER' },
          camp_B: { camp_id: 'camp_B', name: 'Highland Community Center', capacity: 600, occupied: 200, reserved: 0, fill_band: 'GREEN' },
          camp_C: { camp_id: 'camp_C', name: 'Sports Complex', capacity: 800, occupied: 150, reserved: 0, fill_band: 'GREEN' },
          camp_D: { camp_id: 'camp_D', name: 'North Hills Academy', capacity: 500, occupied: 50, reserved: 0, fill_band: 'GREEN' },
          camp_E: { camp_id: 'camp_E', name: 'Riverside Shelter', capacity: 400, occupied: 380, reserved: 0, fill_band: 'RED' },
          camp_F: { camp_id: 'camp_F', name: 'East Valley Depot', capacity: 600, occupied: 100, reserved: 0, fill_band: 'GREEN' }
        },
        roads: {},
        zones: {},
        places: [],
        instructions: [],
        cursor: 0,
        thresholds: {},
        updated_at: new Date().toISOString()
      };
      await db.snapshot.put(snap);
    }

    const outbox = await db.outbox.toArray();
    const camps = selectCamps(snap, outbox);
    const metrics = selectDashboardMetrics(camps, outbox);

    set({
      snapshot: snap,
      outbox,
      camps,
      metrics,
      connectionState: syncEngine.getConnectionState()
    });

    // Attempt background sync
    syncEngine.syncNow().then(async () => {
      const updatedSnap = await db.snapshot.get('latest');
      const updatedOutbox = await db.outbox.toArray();
      const updatedCamps = selectCamps(updatedSnap || null, updatedOutbox);
      set({
        snapshot: updatedSnap || null,
        outbox: updatedOutbox,
        camps: updatedCamps,
        metrics: selectDashboardMetrics(updatedCamps, updatedOutbox),
        connectionState: syncEngine.getConnectionState()
      });
    }).catch(() => {});
  },

  recordArrival: async (campId: string, count: number, groupId?: string) => {
    const nowIso = new Date().toISOString();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: StoredEvent = {
      event_id: eventId,
      device_id: 'CAMP-TAB-LOCAL',
      user_id: 'u_staff_local',
      seq: Date.now(),
      type: 'CAMP_ARRIVAL',
      entity_id: campId,
      payload: { count, group_id: groupId },
      occurred_at: nowIso,
      recorded_at: nowIso,
      hlc: `${nowIso}-0001-CAMP-TAB-LOCAL`,
      status: 'pending'
    };

    await db.outbox.put(event);
    const outbox = await db.outbox.toArray();
    const camps = selectCamps(get().snapshot, outbox);
    const metrics = selectDashboardMetrics(camps, outbox);

    set({
      outbox,
      camps,
      metrics,
      lastEventRecordedAt: Date.now(),
      lastCompensatingEvent: {
        ...event,
        event_id: `undo_${eventId}`,
        type: 'CAMP_DEPARTURE',
        payload: { count }
      },
      canUndo: true
    });

    // Auto-expire undo after 60 seconds
    setTimeout(() => {
      set({ canUndo: false });
    }, 60000);

    // Try sync push in background
    syncEngine.syncNow().catch(() => {});
    return true;
  },

  recordDeparture: async (campId: string, count: number) => {
    const currCamp = get().camps[campId];
    if (!currCamp || currCamp.occupied < count) {
      return { success: false, error: 'Departure would make occupancy negative (Conflict: NEGATIVE_OCCUPANCY)' };
    }

    const nowIso = new Date().toISOString();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: StoredEvent = {
      event_id: eventId,
      device_id: 'CAMP-TAB-LOCAL',
      user_id: 'u_staff_local',
      seq: Date.now(),
      type: 'CAMP_DEPARTURE',
      entity_id: campId,
      payload: { count },
      occurred_at: nowIso,
      recorded_at: nowIso,
      hlc: `${nowIso}-0001-CAMP-TAB-LOCAL`,
      status: 'pending'
    };

    await db.outbox.put(event);
    const outbox = await db.outbox.toArray();
    const camps = selectCamps(get().snapshot, outbox);
    const metrics = selectDashboardMetrics(camps, outbox);

    set({
      outbox,
      camps,
      metrics,
      lastEventRecordedAt: Date.now(),
      lastCompensatingEvent: {
        ...event,
        event_id: `undo_${eventId}`,
        type: 'CAMP_ARRIVAL',
        payload: { count }
      },
      canUndo: true
    });

    setTimeout(() => {
      set({ canUndo: false });
    }, 60000);

    syncEngine.syncNow().catch(() => {});
    return { success: true };
  },

  undoLastAction: async () => {
    const compEvent = get().lastCompensatingEvent;
    if (!compEvent || !get().canUndo) return false;

    await db.outbox.put(compEvent);
    const outbox = await db.outbox.toArray();
    const camps = selectCamps(get().snapshot, outbox);
    const metrics = selectDashboardMetrics(camps, outbox);

    set({
      outbox,
      camps,
      metrics,
      canUndo: false,
      lastCompensatingEvent: null
    });

    syncEngine.syncNow().catch(() => {});
    return true;
  },

  triggerSync: async () => {
    await syncEngine.syncNow();
    const snap = await db.snapshot.get('latest');
    const outbox = await db.outbox.toArray();
    const camps = selectCamps(snap || null, outbox);
    set({
      snapshot: snap || null,
      outbox,
      camps,
      metrics: selectDashboardMetrics(camps, outbox),
      connectionState: syncEngine.getConnectionState()
    });
  },

  toggleSimulatedOffline: (val: boolean) => {
    syncEngine.setSimulatedOffline(val);
    set({ connectionState: syncEngine.getConnectionState() });
  }
}));
