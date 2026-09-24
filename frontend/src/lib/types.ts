export type RiskCategory = "Critical" | "High" | "Medium" | "Low";
export type CampStatus = "open" | "near_capacity" | "full" | "closed";
export type GroupStatus = "waiting" | "moving" | "arrived";
export type GroupType = "boat" | "ground_team" | "air_supply" | "high_truck";
export type RescueUnitStatus = "available" | "in_transit" | "busy" | "offline";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "modified";
export type Language = "en" | "ta" | "ml" | "hi";

export interface User {
  id: string;
  name: string;
  role: "authority" | "public" | "camp_operator" | "ADMIN" | "STAFF";
  district: string;
  language: Language;
  camp_ids?: string[];
}

export interface RiverInfo {
  level_m: number;
  alert_level_m: number;
  trend: string;
}

export interface AlertItem {
  id: string;
  level: RiskCategory;
  title: string;
  zone_id?: string;
}

export interface PublicSummary {
  overall_risk: RiskCategory;
  updated_at: string;
  people_sheltered: number;
  camps_open: number;
  camps_total: number;
  alerts: AlertItem[];
  river: RiverInfo;
}

export interface NearestCamp {
  camp_id: string;
  name: string;
  available: number;
  status: CampStatus;
  meals_available?: number;
  water_liters_available?: number;
  urgent_needs?: string[];
  distance_km?: number;
}

export interface PublicAiUpdate {
  headline: string;
  summary: string;
  what_changed: string[];
  what_to_do: string[];
  nearest_camps: NearestCamp[];
  generated_at: string;
  data_freshness_minutes: number;
  source: "llm" | "template";
  disclaimer: string;
}

export interface FacilityDict {
  water: boolean;
  medical: boolean;
  toilets: boolean;
  power: boolean;
  food: boolean;
  baby_care?: boolean;
}

export interface PublicCamp {
  camp_id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  available: number;
  current_occupancy: number;
  status: CampStatus;
  facilities: FacilityDict;
  contact: string;
  updated_at: string;
  updated_by_role: string;
  geofence_radius_m?: number;
  urgent_needs?: string[];
  meals_available?: number;
  water_liters_available?: number;
  blankets_available?: number;
  medical_kits_available?: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  language: string;
  level: "Info" | "Advisory" | "Warning" | "Evacuate";
  published_at: string;
  published_by: string;
  target_zone?: string;
  predicted_rain_cm?: number;
  predicted_flood_cm?: number;
  ai_suggested?: boolean;
  confirmed_by_authority?: boolean;
}

export interface RiverPoint {
  t: string;
  level_m: number;
  river_name?: string;
}

export interface RainPoint {
  t: string;
  mm: number;
  cm?: number;
}

export interface ZoneForecast {
  zone_id: string;
  name?: string;
  risk_level?: string;
  probability?: number;
  predicted_rain_cm?: number;
  predicted_flood_depth_cm?: number;
  time_to_flood_hours?: number;
  flooded_roads?: string[];
  safe_corridors?: string[];
  p_3h: number;
  p_6h: number;
  p_12h: number;
  confidence: number;
}

export interface PublicForecast {
  river_series: RiverPoint[];
  rain_series: RainPoint[];
  zone_forecast: ZoneForecast[];
  overall_predicted_rain_cm?: number;
  overall_predicted_flood_cm?: number;
  limitations: string;
}

export interface MyLocationRiskResponse {
  user_lat: number;
  user_lng: number;
  matched_zone_id: string;
  matched_zone_name: string;
  risk_level: RiskCategory;
  probability_pct: number;
  predicted_rain_cm: number;
  predicted_flood_depth_cm: number;
  time_to_flood_hours: number;
  time_to_flood_display: string;
  flooded_roads_nearby: string[];
  safe_corridors: string[];
  nearest_camp: NearestCamp & {
    capacity?: number;
    contact?: string;
    lat?: number;
    lng?: number;
  };
  advice: string;
}

export interface AutoCheckinResponse {
  success: boolean;
  camp_id: string;
  camp_name: string;
  people_checked_in: number;
  new_occupancy: number;
  capacity: number;
  remaining_capacity: number;
  status: CampStatus;
  updated_meals_remaining: number;
  updated_water_liters: number;
  message: string;
}

export interface AiCampCandidate {
  candidate_id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  suggested_capacity: number;
  building_type: string;
  proximity_to_flood: string;
  elevation_m: number;
  suitability_score: number;
  recommended_reason: string;
}

export interface AuthorityDashboard {
  affected_population: number;
  flooded_km2: number;
  active_units: number;
  camps_open: number;
  camps_total: number;
  people_sheltered: number;
  unserved: number;
  replans: number;
  over_capacity_events: number;
}

export interface RecommendedAction {
  approval_id: string;
  type: string;
  text: string;
  reason: string;
  confidence: number;
}

export interface AuthorityAiBrief {
  headline: string;
  summary: string;
  risks: string[];
  priorities: { zone_id: string; reason: string }[];
  recommended_actions: RecommendedAction[];
  shortages: string[];
  generated_at: string;
  source: "llm" | "template";
}

export interface ZoneFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    zone_id: string;
    name: string;
    risk_category: RiskCategory;
    probability: number;
    predicted_rain_cm?: number;
    predicted_flood_depth_cm?: number;
    time_to_flood_hours?: number;
    flooded_pct: number;
    flooded_roads?: string[];
    safe_corridors?: string[];
    advice: string;
  };
}

export interface EvacuationGroup {
  group_id: string;
  name?: string;
  source_zone: string;
  group_type?: GroupType;
  boats_count?: number;
  personnel_count?: number;
  air_drop_kits?: number;
  vehicles_count?: number;
  population: number;
  destination_camp: string;
  status: GroupStatus;
  priority?: number;
  eta: string;
  current_location?: string;
  created_at?: string;
}

export interface CampMovement {
  movement_id: string;
  group_id?: string;
  camp_id: string;
  people_count: number;
  arrival_time: string;
  status: string;
  source_zone?: string;
  transport_type: string;
}

export interface ResourceStock {
  camp_id: string;
  camp_name: string;
  occupancy: number;
  stock: {
    food: number;
    water: number;
    medicine: number;
    beds: number;
    fuel: number;
  };
  hours_of_cover: {
    food: number;
    water: number;
    medicine: number;
    fuel?: number;
    min: number;
  };
  shortages: string[];
  last_updated: string;
}

export interface RescueResource {
  resource_id: string;
  name: string;
  type: string;
  capacity: number;
  personnel?: number;
  lat: number;
  lng: number;
  status: RescueUnitStatus;
  assigned_zone?: string;
  eta: string;
}

export interface Approval {
  id: string;
  type: "dispatch" | "camp_redirect" | "transfer" | "supply" | "ai_camp_proposal";
  payload: Record<string, any>;
  reason: string;
  confidence: number;
  status: ApprovalStatus;
  decided_by?: string;
  decision_note?: string;
  created_at: string;
  decided_at?: string;
}

export interface AgentEvent {
  event_id: string;
  timestamp: string;
  agent_name: string;
  action: string;
  input_summary: string;
  output_summary: string;
  status: "success" | "error" | "warning";
  related_zone?: string;
  related_resource?: string;
}

export interface LiveBoardZone {
  zone_id: string;
  name: string;
  needing_evac: number;
}

export interface LiveBoardGroup {
  group_id: string;
  source_zone: string;
  size: number;
  status: GroupStatus;
  destination_camp: string;
  eta: string;
}

export interface LiveBoardCamp {
  camp_id: string;
  name: string;
  capacity: number;
  occupancy: number;
  inbound: number;
  free: number;
  status: CampStatus;
  projected_pct: number;
  hours_of_cover: number;
}

export interface LiveBoardArrival {
  time: string;
  size: number;
  source_zone: string;
  transport: string;
  camp: string;
  status: string;
}

export interface LiveBoardData {
  zones: LiveBoardZone[];
  groups: LiveBoardGroup[];
  camps: LiveBoardCamp[];
  arrivals: LiveBoardArrival[];
  warnings: string[];
}

export type RescueUnit = RescueResource;
export type ResourceItem = ResourceStock;
export type AuthorityCamp = PublicCamp;

export interface AgentHealth {
  agent_id?: string;
  name: string;
  status: "active" | "idle" | "error";
  last_active?: string;
  execution_count?: number;
  avg_latency_ms?: number;
  runs?: number;
  last_message?: string;
}

export interface LoopStage {
  stage: string;
  message: string;
  cycle_id: string;
  timestamp: string;
  recent_events: Array<{
    agent: string;
    action: string;
    summary: string;
    time: string;
  }>;
}

export interface RescueDirective {
  id: string;
  target_zone: string;
  location_name: string;
  lat: number;
  lng: number;
  people_count: number;
  urgency: "Critical" | "High" | "Medium";
  how_to_rescue: string; // Specific instructions on equipment, boat type, approach corridor
  assigned_camp_id: string;
  assigned_camp_name: string;
  equipment_needed: string[];
  vulnerabilities: {
    children?: number;
    elderly?: number;
    medical?: number;
  };
  status: "dispatched" | "acknowledged" | "en_route" | "completed";
  dispatched_at: string;
  dispatched_by: string;
  operator_notes?: string;
  arrived_count?: number;
}

export interface CampHeadcountReport {
  report_id: string;
  camp_id: string;
  camp_name: string;
  operator_id: string;
  operator_name: string;
  total_occupancy: number;
  capacity: number;
  newly_arrived: number;
  discharged: number;
  breakdown: {
    men: number;
    women: number;
    children: number;
    seniors: number;
    medical_patients: number;
  };
  supplies: {
    meals_remaining: number;
    water_liters_remaining: number;
    blankets: number;
    medical_kits: number;
  };
  urgent_needs: string[];
  reported_at: string;
  synced: boolean;
}

export interface OfflineRouteStep {
  instruction: string;
  road_name: string;
  distance_km: number;
  status: "SAFE" | "CAUTION" | "BLOCKED";
  is_elevated_corridor?: boolean;
}

export interface OfflineRouteResult {
  origin: { name: string; lat: number; lng: number };
  destinationCamp: PublicCamp;
  totalDistanceKm: number;
  estimatedTravelMinutes: number;
  safetyScore: number; // 0-100
  isOfflineComputed: boolean;
  steps: OfflineRouteStep[];
  pathCoordinates: [number, number][];
  hazardsAvoided: string[];
  recommendedCorridor: string;
}


