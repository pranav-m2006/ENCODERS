/**
 * Local-First Sync Engine for FloodOps.
 * Features:
 * - Real connectivity check against /api/v1/health (does not trust navigator.onLine)
 * - Push outbox batches -> server confirms/rejects -> re-layer outbox
 * - Simulated offline toggle (enforced in fetch wrapper)
 * - Emergency outbox export to JSON file
 */
import { db, StoredEvent, StoredSnapshot } from './db';
import { PublicCamp } from '../lib/types';

export type ConnectionState = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'SIMULATED_OFFLINE';

class SyncEngine {
  private isSimulatedOffline = false;
  private connectionState: ConnectionState = 'ONLINE';
  private apiBase = typeof window !== 'undefined' && import.meta.env.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE.replace(/\/api\/?$/, '')}/api/v1`
    : '/api/v1';
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startPeriodicSync();
  }

  public setSimulatedOffline(val: boolean) {
    this.isSimulatedOffline = val;
    this.connectionState = val ? 'SIMULATED_OFFLINE' : 'ONLINE';
  }

  public getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public getConnectionState(): ConnectionState {
    if (this.isSimulatedOffline) return 'SIMULATED_OFFLINE';
    return this.connectionState;
  }

  public async checkHealth(): Promise<boolean> {
    if (this.isSimulatedOffline) return false;
    try {
      const res = await fetch(`${this.apiBase}/health`, { signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      this.connectionState = ok ? 'ONLINE' : 'DEGRADED';
      return ok;
    } catch {
      this.connectionState = 'OFFLINE';
      return false;
    }
  }

  public async syncNow(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    const isOnline = await this.checkHealth();
    if (!isOnline) {
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    // 1. Batch Push Outbox
    const outboxEvents = await db.outbox.toArray();
    let pushedCount = 0;
    let conflictCount = 0;

    if (outboxEvents.length > 0) {
      try {
        const res = await fetch(`${this.apiBase}/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: 'BROWSER-CLIENT-1',
            events: outboxEvents
          })
        });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const results = body?.data?.results || [];
          for (const r of results) {
            if (r.result === 'APPLIED' || r.result === 'DUPLICATE') {
              await db.outbox.delete(r.event_id);
              pushedCount++;
            } else if (r.result === 'CONFLICT') {
              conflictCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Sync push failed:', e);
      }
    }

    // 2. Pull New Events & Snapshot
    let pulledCount = 0;
    try {
      const metaCursor = await db.meta.get('cursor');
      const sinceCursor = metaCursor ? metaCursor.value : 0;

      const pullRes = await fetch(`${this.apiBase}/sync/pull?since=${sinceCursor}`);
      if (pullRes.ok) {
        const pullBody = await pullRes.json().catch(() => null);
        const data = pullBody?.data || {};
        const events = data.events || [];
        for (const evt of events) {
          await db.events_applied.put(evt);
          pulledCount++;
        }
        if (data.cursor) {
          await db.meta.put({ key: 'cursor', value: data.cursor });
        }
      }
    } catch (e) {
      console.warn('Sync pull failed:', e);
    }

    // Update bootstrap snapshot
    try {
      const bootRes = await fetch(`${this.apiBase}/bootstrap`);
      if (bootRes.ok) {
        const bootBody = await bootRes.json().catch(() => null);
        const bootData = bootBody?.data || {};
        const campsMap: Record<string, PublicCamp> = {};
        for (const c of bootData.camps || []) {
          campsMap[c.camp_id] = c;
        }
        await db.snapshot.put({
          id: 'latest',
          camps: campsMap,
          roads: bootData.roads || [],
          zones: bootData.zones || [],
          places: bootData.places || [],
          instructions: bootData.instructions || [],
          cursor: bootData.cursor || 0,
          thresholds: bootData.thresholds || {},
          updated_at: new Date().toISOString()
        });
      }
    } catch {}

    return { pushed: pushedCount, pulled: pulledCount, conflicts: conflictCount };
  }

  public async exportOutboxToFile() {
    const events = await db.outbox.toArray();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `floodops_outbox_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  private startPeriodicSync() {
    this.syncTimer = setInterval(() => {
      this.syncNow().catch(() => {});
    }, 15000); // 15 seconds
  }
}

export const syncEngine = new SyncEngine();
