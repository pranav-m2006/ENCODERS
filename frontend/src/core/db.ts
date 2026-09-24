import Dexie, { Table } from 'dexie';
import { PublicCamp, RescueDirective, CampHeadcountReport, Announcement } from '../lib/types';

export interface StoredEvent {
  event_id: string;
  device_id: string;
  user_id: string;
  seq: number;
  type: string;
  entity_id: string;
  payload: any;
  occurred_at: string;
  recorded_at: string;
  hlc: string;
  base_version?: number | null;
  server_seq?: number;
  result?: string;
  status?: 'pending' | 'synced' | 'conflict';
}

export interface StoredSnapshot {
  id: string;
  camps: Record<string, any>;
  roads: Record<string, any>;
  zones: Record<string, any>;
  places: any[];
  instructions: any[];
  cursor: number;
  thresholds: Record<string, number>;
  updated_at: string;
}

export interface StoredMeta {
  key: string;
  value: any;
}

export interface OfflineRoadSegment {
  road_id: string;
  name: string;
  from_node: string;
  to_node: string;
  from_coords: [number, number];
  to_coords: [number, number];
  length_km: number;
  status: 'SAFE' | 'CAUTION' | 'BLOCKED';
  is_elevated_corridor?: boolean;
  water_depth_cm?: number;
  notes?: string;
}

export class FloodOpsDatabase extends Dexie {
  snapshot!: Table<StoredSnapshot, string>;
  events_applied!: Table<StoredEvent, string>;
  outbox!: Table<StoredEvent, string>;
  meta!: Table<StoredMeta, string>;
  camps_offline!: Table<PublicCamp, string>;
  roads_offline!: Table<OfflineRoadSegment, string>;
  directives_offline!: Table<RescueDirective, string>;
  reports_offline!: Table<CampHeadcountReport, string>;
  announcements_offline!: Table<Announcement, string>;

  constructor() {
    super('FloodOpsLocalDB');
    this.version(1).stores({
      snapshot: 'id',
      events_applied: 'event_id, server_seq, type, entity_id',
      outbox: 'event_id, seq, type, entity_id',
      meta: 'key'
    });
    this.version(2).stores({
      snapshot: 'id',
      events_applied: 'event_id, server_seq, type, entity_id',
      outbox: 'event_id, seq, type, entity_id',
      meta: 'key',
      camps_offline: 'camp_id, status, capacity, current_occupancy',
      roads_offline: 'road_id, from_node, to_node, status',
      directives_offline: 'id, assigned_camp_id, status, urgency',
      reports_offline: 'report_id, camp_id, reported_at, synced',
      announcements_offline: 'id, level, published_at'
    });
  }
}

export const db = new FloodOpsDatabase();
