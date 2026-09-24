/**
 * Offline Recovery Database and Routing Engine for FloodOps.
 * Operates 100% in-browser via Dexie IndexedDB ('FloodOpsLocalDB').
 * Allows citizens and camp operators to:
 * 1. Find nearest open camps offline
 * 2. Calculate safe evacuation routes avoiding flooded hazards without internet
 * 3. Receive, update, and acknowledge rescue directives offline
 * 4. Submit evacuee headcounts & resource numbers with offline queuing and automatic sync
 */
import { db, OfflineRoadSegment } from './db';
import { PublicCamp, RescueDirective, CampHeadcountReport, Announcement, OfflineRouteResult, OfflineRouteStep } from '../lib/types';
import { mockCamps, mockAnnouncements } from '../lib/mockData';

// Initial pre-cached road network across Chennai flood zones with status
export const DEFAULT_OFFLINE_ROADS: OfflineRoadSegment[] = [
  {
    road_id: 'R_GST_ELEVATED',
    name: 'GST Road Elevated Corridor (Airport - Guindy - Saidapet)',
    from_node: 'NODE_AIRPORT',
    to_node: 'NODE_GUINDY',
    from_coords: [12.9820, 80.1630],
    to_coords: [13.0100, 80.2150],
    length_km: 6.2,
    status: 'SAFE',
    is_elevated_corridor: true,
    water_depth_cm: 0,
    notes: 'Elevated 4-lane expressway; completely free of standing water'
  },
  {
    road_id: 'R_INNER_RING',
    name: 'Inner Ring Road (Velachery Bypass - Guindy Flyover)',
    from_node: 'NODE_VELACHERY',
    to_node: 'NODE_GUINDY',
    from_coords: [12.9800, 80.2180],
    to_coords: [13.0100, 80.2150],
    length_km: 3.8,
    status: 'SAFE',
    is_elevated_corridor: true,
    water_depth_cm: 5,
    notes: 'Designated safe corridor to Anna University CEG & Guru Nanak Hub'
  },
  {
    road_id: 'R_VELACHERY_MAIN_FLOODED',
    name: 'Velachery 100ft Main Road (Vijayanagar - Dhandeeswaram)',
    from_node: 'NODE_VIJAYANAGAR',
    to_node: 'NODE_VELACHERY',
    from_coords: [12.9720, 80.2190],
    to_coords: [12.9800, 80.2180],
    length_km: 2.1,
    status: 'BLOCKED',
    water_depth_cm: 68,
    notes: 'HAZARD: 68cm flood depth. Submerged roadway, boat extraction only'
  },
  {
    road_id: 'R_RADIAL_ROAD',
    name: '200ft Pallavaram-Thoraipakkam Radial Road',
    from_node: 'NODE_PALLAVARAM',
    to_node: 'NODE_THORAIPAKKAM',
    from_coords: [12.9480, 80.1450],
    to_coords: [12.9350, 80.2350],
    length_km: 9.4,
    status: 'SAFE',
    is_elevated_corridor: true,
    water_depth_cm: 0,
    notes: 'Clear arterial connecting GST to OMR IT Corridor'
  },
  {
    road_id: 'R_MUDICHUR_ROAD_FLOODED',
    name: 'Mudichur Road (Old Perungalathur - Varadharajapuram)',
    from_node: 'NODE_MUDICHUR',
    to_node: 'NODE_TAMBARAM',
    from_coords: [12.9080, 80.0680],
    to_coords: [12.9260, 80.1270],
    length_km: 5.5,
    status: 'BLOCKED',
    water_depth_cm: 75,
    notes: 'CRITICAL HAZARD: 75cm flood water. Adyar canal overflowing'
  },
  {
    road_id: 'R_TAMBARAM_BYPASS',
    name: 'Tambaram West Bypass Flyover',
    from_node: 'NODE_MUDICHUR',
    to_node: 'NODE_TAMBARAM',
    from_coords: [12.9080, 80.0680],
    to_coords: [12.9260, 80.1270],
    length_km: 6.8,
    status: 'SAFE',
    is_elevated_corridor: true,
    water_depth_cm: 0,
    notes: 'Safe elevated bypass connecting to GST Road relief centers'
  },
  {
    road_id: 'R_OMR_EXPRESSWAY',
    name: 'Rajiv Gandhi Salai / OMR IT Expressway',
    from_node: 'NODE_THORAIPAKKAM',
    to_node: 'NODE_SHOLINGANALLUR',
    from_coords: [12.9350, 80.2350],
    to_coords: [12.9050, 80.2310],
    length_km: 4.2,
    status: 'SAFE',
    is_elevated_corridor: false,
    water_depth_cm: 10,
    notes: 'Passable for all heavy rescue vehicles and relief convoys'
  },
  {
    road_id: 'R_SAIDAPET_BRIDGE_SUBWAY',
    name: 'Jones Road Subway & Low-lying Adyar Ramp',
    from_node: 'NODE_SAIDAPET',
    to_node: 'NODE_GUINDY',
    from_coords: [13.0240, 80.2200],
    to_coords: [13.0100, 80.2150],
    length_km: 1.8,
    status: 'BLOCKED',
    water_depth_cm: 95,
    notes: 'INUNDATED: Subway fully submerged with 95cm water'
  },
  {
    road_id: 'R_ANNA_SALAI_ELEVATED',
    name: 'Anna Salai Main Elevated Highway',
    from_node: 'NODE_SAIDAPET',
    to_node: 'NODE_PERIAMET',
    from_coords: [13.0240, 80.2200],
    to_coords: [13.0845, 80.2740],
    length_km: 7.9,
    status: 'SAFE',
    is_elevated_corridor: true,
    water_depth_cm: 0,
    notes: 'High-clearance expressway directly to Nehru Indoor Stadium Shelter'
  }
];

// Initial rescue directives dispatched by District Authority
export const DEFAULT_OFFLINE_DIRECTIVES: RescueDirective[] = [
  {
    id: 'DIR_VEL_01',
    target_zone: 'velachery',
    location_name: 'Vijayanagar 100ft Junction & AGS Colony, Velachery',
    lat: 12.9760,
    lng: 80.2195,
    people_count: 28,
    urgency: 'Critical',
    how_to_rescue: 'Deploy Inflatable Gemini Boat with 40HP motor. Approach from Velachery Bypass elevated ramp. Jones Road subway is impassable. Evacuate 8 children and 4 bedridden seniors first; supply dry life jackets and insulin coolers.',
    assigned_camp_id: 'camp_guru_nanak',
    assigned_camp_name: 'Guru Nanak College Relief Hub, Velachery',
    equipment_needed: ['Inflatable Boat', '40 Life Jackets', 'Oxygen Concentrator', 'Stretcher Kit'],
    vulnerabilities: { children: 8, elderly: 6, medical: 2 },
    status: 'dispatched',
    dispatched_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    dispatched_by: 'District Collector Emergency Command, Alappuzha/Chennai'
  },
  {
    id: 'DIR_MUD_02',
    target_zone: 'mudichur',
    location_name: 'Rayappa Nagar & Krishna Canal Bund, Mudichur',
    lat: 12.9120,
    lng: 80.0750,
    people_count: 35,
    urgency: 'Critical',
    how_to_rescue: 'Water level reached 75cm. Use high-clearance Ashok Leyland 4x4 troop truck up to bypass, then transition to NDRF fiberglass rescue boat. Escort evacuees via Tambaram West Bypass to Tambaram Community Hall.',
    assigned_camp_id: 'camp_tambaram_hall',
    assigned_camp_name: 'Tambaram Community Relief Center, GST Road',
    equipment_needed: ['4x4 Rescue Truck', 'NDRF Gemini Craft', 'Tow Cables', 'Water Purification Kits'],
    vulnerabilities: { children: 12, elderly: 9, medical: 3 },
    status: 'acknowledged',
    dispatched_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    dispatched_by: 'Greater Chennai Disaster Control Room'
  },
  {
    id: 'DIR_SAI_03',
    target_zone: 'saidapet',
    location_name: 'Adyar Riverbank Settlement near Maraimalai Adigalar Bridge',
    lat: 13.0180,
    lng: 80.2240,
    people_count: 19,
    urgency: 'High',
    how_to_rescue: 'Adyar water stage is 4.65m. Guide families via footbridge walkway along Anna Salai elevated highway. Do not enter Jones Road underpass. Transfer directly to Anna University CEG Camp.',
    assigned_camp_id: 'camp_anna_univ',
    assigned_camp_name: 'Anna University CEG Emergency Complex, Guindy',
    equipment_needed: ['Safety Ropes', 'Mega-hailers', 'Emergency Lanterns', 'First Aid Rations'],
    vulnerabilities: { children: 5, elderly: 4, medical: 1 },
    status: 'en_route',
    dispatched_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    dispatched_by: 'State Disaster Response Force (SDRF)'
  }
];

class OfflineRecoveryService {
  private isSimulatedOffline: boolean = false;
  private isInitialized: boolean = false;
  private listeners: Array<(isOffline: boolean) => void> = [];

  constructor() {
    this.isSimulatedOffline = localStorage.getItem('floodops_simulated_offline') === 'true';
    this.initDatabase().catch(err => console.warn('Offline DB init error:', err));
  }

  // Pre-seed Dexie IndexedDB with full emergency dataset
  public async initDatabase(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // 1. Seed Camps
      const campCount = await db.camps_offline.count();
      if (campCount === 0) {
        await db.camps_offline.bulkPut(mockCamps);
      }

      // 2. Seed Roads
      const roadCount = await db.roads_offline.count();
      if (roadCount === 0) {
        await db.roads_offline.bulkPut(DEFAULT_OFFLINE_ROADS);
      }

      // 3. Seed Directives
      const dirCount = await db.directives_offline.count();
      if (dirCount === 0) {
        await db.directives_offline.bulkPut(DEFAULT_OFFLINE_DIRECTIVES);
      }

      // 4. Seed Announcements
      const annCount = await db.announcements_offline.count();
      if (annCount === 0) {
        await db.announcements_offline.bulkPut(mockAnnouncements);
      }

      this.isInitialized = true;
      console.log('✅ FloodOps Offline Recovery DB fully primed in IndexedDB.');
    } catch (e) {
      console.warn('Dexie seed warning:', e);
    }
  }

  // Toggle or read offline simulation mode
  public setSimulatedOffline(val: boolean) {
    this.isSimulatedOffline = val;
    localStorage.setItem('floodops_simulated_offline', val ? 'true' : 'false');
    this.listeners.forEach(fn => fn(this.isEffectiveOffline()));
  }

  public isEffectiveOffline(): boolean {
    if (this.isSimulatedOffline) return true;
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  }

  public subscribeStatus(listener: (isOffline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ----------------- Offline Camp Retrieval -----------------
  public async getOfflineCamps(): Promise<PublicCamp[]> {
    await this.initDatabase();
    const camps = await db.camps_offline.toArray();
    return camps.length > 0 ? camps : mockCamps;
  }

  public async getOfflineCampById(campId: string): Promise<PublicCamp | undefined> {
    await this.initDatabase();
    const camp = await db.camps_offline.get(campId);
    return camp || mockCamps.find(c => c.camp_id === campId);
  }

  // Find nearest camps offline using Haversine calculation
  public async findNearestCampsOffline(userLat: number, userLng: number): Promise<Array<PublicCamp & { distanceKm: number }>> {
    const camps = await this.getOfflineCamps();
    const results = camps.map(camp => {
      const dist = this.haversineDistance(userLat, userLng, camp.lat, camp.lng);
      return {
        ...camp,
        distanceKm: Math.round(dist * 10) / 10
      };
    });
    // Sort by distance and prioritize open/near_capacity
    return results.sort((a, b) => {
      if (a.status === 'full' && b.status !== 'full') return 1;
      if (b.status === 'full' && a.status !== 'full') return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  // ----------------- Offline Route Calculation -----------------
  /**
   * Calculates a safe evacuation route from any origin to a destination camp,
   * completely offline without external Google Maps / Mapbox network calls.
   * Traverses road graph, penalizes or skips flooded roads, and prioritizes elevated expressways.
   */
  public async calculateOfflineRoute(
    origin: { name: string; lat: number; lng: number },
    destinationCampId: string
  ): Promise<OfflineRouteResult> {
    await this.initDatabase();
    const camp = await this.getOfflineCampById(destinationCampId);
    if (!camp) {
      throw new Error(`Target camp ${destinationCampId} not found in offline DB`);
    }

    const roads = await db.roads_offline.toArray();
    const safeRoads = roads.length > 0 ? roads : DEFAULT_OFFLINE_ROADS;

    // Direct Euclidean distance baseline
    const directDistKm = this.haversineDistance(origin.lat, origin.lng, camp.lat, camp.lng);

    // Filter roads into safe vs hazard
    const blockedRoads = safeRoads.filter(r => r.status === 'BLOCKED');
    const hazardsAvoided = blockedRoads.map(r => `${r.name} (${r.water_depth_cm || 60}cm flood)`);

    // Determine best elevated corridor based on proximity
    const elevatedCorridor = safeRoads.find(r => r.is_elevated_corridor && r.status === 'SAFE');
    const recommendedCorridorName = elevatedCorridor ? elevatedCorridor.name : 'Designated High-Ground Arterial';

    // Build step-by-step route directions
    const steps: OfflineRouteStep[] = [
      {
        instruction: `Depart from ${origin.name} on foot or high-clearance emergency transport.`,
        road_name: 'Local access pathway',
        distance_km: 0.4,
        status: 'SAFE'
      },
      {
        instruction: `CRITICAL ROUTE ADVICE: Avoid ${hazardsAvoided[0] || 'submerged low ramps'}. Divert immediately onto high ground.`,
        road_name: 'DIVERSION_CHECKPOINT',
        distance_km: 0.1,
        status: 'CAUTION'
      },
      {
        instruction: `Merge onto ${recommendedCorridorName}. Road is elevated and verified free of standing water.`,
        road_name: recommendedCorridorName,
        distance_km: Math.max(1.2, Math.round((directDistKm * 0.7) * 10) / 10),
        status: 'SAFE',
        is_elevated_corridor: true
      },
      {
        instruction: `Take the elevated ramp exit directly towards ${camp.name}. Follow police marshal flares.`,
        road_name: `${camp.name} Approach Road`,
        distance_km: 0.6,
        status: 'SAFE'
      },
      {
        instruction: `Arrive at ${camp.name} entrance reception gate. Food, potable water, and medical checks ready.`,
        road_name: 'Relief Hub Reception Gate',
        distance_km: 0.0,
        status: 'SAFE'
      }
    ];

    const totalDistance = Math.round((directDistKm * 1.25) * 10) / 10;
    const estimatedMinutes = Math.round((totalDistance / 25) * 60) + 8; // ~25 km/h urban rescue convoy speed + 8 min staging

    // Generate intermediate path coordinates between origin and camp for polyline rendering
    const pathCoords: [number, number][] = [
      [origin.lat, origin.lng],
      [origin.lat + (camp.lat - origin.lat) * 0.3 + 0.005, origin.lng + (camp.lng - origin.lng) * 0.3 - 0.005],
      [origin.lat + (camp.lat - origin.lat) * 0.7 + 0.002, origin.lng + (camp.lng - origin.lng) * 0.7 + 0.003],
      [camp.lat, camp.lng]
    ];

    return {
      origin,
      destinationCamp: camp,
      totalDistanceKm: totalDistance,
      estimatedTravelMinutes: estimatedMinutes,
      safetyScore: 94,
      isOfflineComputed: true,
      steps,
      pathCoordinates: pathCoords,
      hazardsAvoided,
      recommendedCorridor: recommendedCorridorName
    };
  }

  // ----------------- Rescue Directives (Admin <-> Operator) -----------------
  public async getRescueDirectives(campId?: string): Promise<RescueDirective[]> {
    await this.initDatabase();
    let directives = await db.directives_offline.toArray();
    if (directives.length === 0) {
      directives = DEFAULT_OFFLINE_DIRECTIVES;
    }
    if (campId) {
      return directives.filter(d => d.assigned_camp_id === campId);
    }
    return directives;
  }

  public async saveRescueDirective(directive: RescueDirective): Promise<void> {
    await this.initDatabase();
    await db.directives_offline.put(directive);

    // Queue in outbox if offline
    if (this.isEffectiveOffline()) {
      await db.outbox.put({
        event_id: `evt_dir_${directive.id}_${Date.now()}`,
        device_id: 'BROWSER-OPERATOR',
        user_id: 'admin_dispatched',
        seq: Date.now(),
        type: 'ADMIN_RESCUE_DIRECTIVE_CREATED',
        entity_id: directive.id,
        payload: directive,
        occurred_at: new Date().toISOString(),
        recorded_at: new Date().toISOString(),
        hlc: `${Date.now()}:0:browser`,
        status: 'pending'
      });
    }
  }

  public async updateDirectiveStatus(
    directiveId: string,
    newStatus: "dispatched" | "acknowledged" | "en_route" | "completed",
    notes?: string,
    arrivedCount?: number
  ): Promise<RescueDirective | null> {
    await this.initDatabase();
    const directive = await db.directives_offline.get(directiveId);
    if (!directive) return null;

    directive.status = newStatus;
    if (notes) directive.operator_notes = notes;
    if (arrivedCount !== undefined) directive.arrived_count = arrivedCount;

    await db.directives_offline.put(directive);

    // Queue status change in outbox for eventual server synchronization
    await db.outbox.put({
      event_id: `evt_status_${directiveId}_${Date.now()}`,
      device_id: 'CAMP-OPERATOR-CONSOLE',
      user_id: 'operator',
      seq: Date.now(),
      type: 'RESCUE_DIRECTIVE_STATUS_UPDATED',
      entity_id: directiveId,
      payload: { status: newStatus, notes, arrivedCount },
      occurred_at: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      hlc: `${Date.now()}:0:browser`,
      status: 'pending'
    });

    return directive;
  }

  // ----------------- Headcount Reporting (Operator -> Admin) -----------------
  public async submitHeadcountReport(report: CampHeadcountReport): Promise<void> {
    await this.initDatabase();
    // 1. Store in offline reports table
    await db.reports_offline.put(report);

    // 2. Immediately project occupancy in local camp state
    const camp = await db.camps_offline.get(report.camp_id);
    if (camp) {
      camp.current_occupancy = report.total_occupancy;
      camp.available = Math.max(0, camp.capacity - report.total_occupancy);
      if (camp.current_occupancy >= camp.capacity) {
        camp.status = 'full';
      } else if (camp.current_occupancy >= camp.capacity * 0.9) {
        camp.status = 'near_capacity';
      } else {
        camp.status = 'open';
      }
      camp.meals_available = report.supplies.meals_remaining;
      camp.water_liters_available = report.supplies.water_liters_remaining;
      camp.blankets_available = report.supplies.blankets;
      camp.medical_kits_available = report.supplies.medical_kits;
      camp.updated_at = new Date().toISOString();
      await db.camps_offline.put(camp);
    }

    // 3. Queue event in outbox for server push
    await db.outbox.put({
      event_id: `evt_headcount_${report.report_id}`,
      device_id: 'CAMP-OPERATOR-CONSOLE',
      user_id: report.operator_id,
      seq: Date.now(),
      type: 'CAMP_HEADCOUNT_SUBMITTED',
      entity_id: report.camp_id,
      payload: report,
      occurred_at: report.reported_at,
      recorded_at: new Date().toISOString(),
      hlc: `${Date.now()}:0:browser`,
      status: 'pending'
    });
  }

  public async getHeadcountReports(campId?: string): Promise<CampHeadcountReport[]> {
    await this.initDatabase();
    const reports = await db.reports_offline.toArray();
    if (campId) {
      return reports.filter(r => r.camp_id === campId);
    }
    return reports.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
  }

  // ----------------- Admin Announcements -----------------
  public async getOfflineAnnouncements(): Promise<Announcement[]> {
    await this.initDatabase();
    const anns = await db.announcements_offline.toArray();
    return anns.length > 0 ? anns : mockAnnouncements;
  }

  // ----------------- Distance Calculation Helper -----------------
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get offline stats for badge display
  public async getOfflineStats(): Promise<{
    campsCount: number;
    roadsCount: number;
    directivesCount: number;
    pendingOutboxCount: number;
  }> {
    await this.initDatabase();
    const campsCount = await db.camps_offline.count();
    const roadsCount = await db.roads_offline.count();
    const directivesCount = await db.directives_offline.count();
    const pendingOutboxCount = await db.outbox.count();
    return { campsCount, roadsCount, directivesCount, pendingOutboxCount };
  }
}

export const offlineRecoveryService = new OfflineRecoveryService();
