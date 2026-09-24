import {
  PublicSummary, PublicAiUpdate, PublicCamp, Announcement,
  PublicForecast, AuthorityDashboard, AuthorityAiBrief,
  ResourceStock, RescueResource, EvacuationGroup, Approval, LiveBoardData,
  LoopStage, AiCampCandidate, MyLocationRiskResponse, AutoCheckinResponse,
  RescueDirective, CampHeadcountReport, OfflineRouteResult
} from './types';
import {
  mockSummary, mockAiUpdate, mockCamps,
  mockAnnouncements, mockForecast, mockAuthorityDashboard,
  mockAuthorityAiBrief, mockLiveBoardData, mockLoopStage,
  mockResourceStocks, mockRescueUnits, mockEvacuationGroups,
  mockApprovals, mockAgentEvents, mockAiCampCandidates,
  mockDefaultLocationRisk, mockZoneGeoJson, mockAgentHealth
} from './mockData';

import { useAuthStore } from '../store/authStore';
import { offlineRecoveryService, DEFAULT_OFFLINE_DIRECTIVES } from '../core/offlineRecoveryDb';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// In-Memory state for mock mode updates
class MockService {
  public summary: PublicSummary = { ...mockSummary };
  public aiUpdate: PublicAiUpdate = { ...mockAiUpdate };
  public camps: PublicCamp[] = [...mockCamps];
  public announcements: Announcement[] = [...mockAnnouncements];
  public forecast: PublicForecast = { ...mockForecast };
  public dashboard: AuthorityDashboard = { ...mockAuthorityDashboard };
  public aiBrief: AuthorityAiBrief = { ...mockAuthorityAiBrief };
  public liveBoard: LiveBoardData = JSON.parse(JSON.stringify(mockLiveBoardData));
  public resources: ResourceStock[] = JSON.parse(JSON.stringify(mockResourceStocks));
  public units: RescueResource[] = [...mockRescueUnits];
  public groups: EvacuationGroup[] = [...mockEvacuationGroups];
  public approvals: Approval[] = [...mockApprovals];
  public loop: LoopStage = { ...mockLoopStage };
  public aiCampCandidates: AiCampCandidate[] = [...mockAiCampCandidates];
  public directives: RescueDirective[] = [...DEFAULT_OFFLINE_DIRECTIVES];
  public headcountReports: CampHeadcountReport[] = [];

  submitHeadcount(report: CampHeadcountReport) {
    this.headcountReports.unshift(report);
    this.updateCampOccupancy(report.camp_id, report.total_occupancy);
    const camp = this.camps.find(c => c.camp_id === report.camp_id);
    if (camp) {
      camp.meals_available = report.supplies.meals_remaining;
      camp.water_liters_available = report.supplies.water_liters_remaining;
      camp.blankets_available = report.supplies.blankets;
      camp.medical_kits_available = report.supplies.medical_kits;
    }
  }

  updateCampOccupancy(campId: string, occupancy: number) {
    const camp = this.camps.find(c => c.camp_id === campId);
    if (camp) {
      camp.capacity = camp.capacity || 1500;
      camp.current_occupancy = occupancy;
      camp.available = Math.max(0, camp.capacity - occupancy);
      if (occupancy >= camp.capacity) camp.status = "full";
      else if (occupancy >= camp.capacity * 0.9) camp.status = "near_capacity";
      else camp.status = "open";
      camp.updated_at = new Date().toISOString();
    }

    const lbCamp = this.liveBoard.camps.find(c => c.camp_id === campId);
    if (lbCamp) {
      lbCamp.occupancy = occupancy;
      lbCamp.free = Math.max(0, lbCamp.capacity - (occupancy + lbCamp.inbound));
      lbCamp.projected_pct = Math.round(((occupancy + lbCamp.inbound) / lbCamp.capacity) * 100);
      if (occupancy >= lbCamp.capacity) lbCamp.status = "full";
      else if (lbCamp.projected_pct >= 90) lbCamp.status = "near_capacity";
      else lbCamp.status = "open";
    }

    const res = this.resources.find(r => r.camp_id === campId);
    if (res) res.occupancy = occupancy;
  }

  autoCheckin(campId: string, peopleCount: number = 1): AutoCheckinResponse {
    const camp = this.camps.find(c => c.camp_id === campId);
    const count = Math.max(1, peopleCount);
    if (camp) {
      this.updateCampOccupancy(campId, camp.current_occupancy + count);
      camp.meals_available = Math.max(0, (camp.meals_available || 2000) - count * 2);
      camp.water_liters_available = Math.max(0, (camp.water_liters_available || 6000) - count * 5);
      return {
        success: true,
        camp_id: camp.camp_id,
        camp_name: camp.name,
        people_checked_in: count,
        new_occupancy: camp.current_occupancy,
        capacity: camp.capacity,
        remaining_capacity: camp.available,
        status: camp.status,
        updated_meals_remaining: camp.meals_available,
        updated_water_liters: camp.water_liters_available,
        message: `Successfully checked into ${camp.name}. Occupancy and remaining meals updated.`
      };
    }
    return {
      success: false,
      camp_id: campId,
      camp_name: "Chennai Relief Camp",
      people_checked_in: 0,
      new_occupancy: 0,
      capacity: 1000,
      remaining_capacity: 0,
      status: "open",
      updated_meals_remaining: 0,
      updated_water_liters: 0,
      message: "Camp not found"
    };
  }
}

export const mockState = new MockService();

// Helper for API fetch
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('floodops_token') || useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (USE_MOCK || offlineRecoveryService.isEffectiveOffline()) {
    return handleMockRequest<T>(endpoint, options);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().logout();
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.error?.message || 'API request failed');
    }
    return res.json();
  } catch (error) {
    console.warn(`Fetch error for ${endpoint}, falling back to mock mode:`, error);
    return handleMockRequest<T>(endpoint, options);
  }
}

function handleMockRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  const method = options.method || 'GET';

  // Auth endpoints fallback
  if (endpoint.startsWith('/auth/login')) {
    const body = JSON.parse(options.body as string || '{}');
    const email = (body.email || '').toLowerCase();
    let role: 'authority' | 'camp_operator' | 'public' = 'public';
    let name = 'Citizen User';
    let camp_ids: string[] | undefined = undefined;

    if (email.includes('collector') || email.includes('admin') || email.includes('auth')) {
      role = 'authority';
      name = 'District Collector, Alappuzha/Chennai';
    } else if (email.includes('operator') || email.includes('staff')) {
      role = 'camp_operator';
      name = 'Camp In-Charge (Guru Nanak Relief Hub)';
      camp_ids = ['camp_guru_nanak'];
    }

    return Promise.resolve({
      access_token: `mock_jwt_${role}_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: `u_${role}_demo`,
        name,
        email: body.email,
        role,
        district: 'Chennai Metropolitan Basin',
        language: 'en',
        camp_ids
      }
    } as unknown as T);
  }

  if (endpoint.startsWith('/auth/register')) {
    const body = JSON.parse(options.body as string || '{}');
    return Promise.resolve({
      access_token: `mock_jwt_public_${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: `u_public_${Date.now()}`,
        name: body.name || 'Citizen User',
        email: body.email,
        role: 'public',
        district: body.district || 'Chennai Metropolitan Basin',
        language: body.language || 'en'
      }
    } as unknown as T);
  }

  if (endpoint.startsWith('/authority/agents')) {
    return Promise.resolve(mockAgentHealth as unknown as T);
  }

  if (endpoint.startsWith('/public/summary')) return Promise.resolve(mockState.summary as unknown as T);
  if (endpoint.startsWith('/public/ai-update')) return Promise.resolve(mockState.aiUpdate as unknown as T);
  if (endpoint.startsWith('/public/camps') && !endpoint.includes('auto-checkin')) return Promise.resolve(mockState.camps as unknown as T);
  if (endpoint.includes('/auto-checkin')) {
    const parts = endpoint.split('/');
    const campId = parts[3];
    const body = JSON.parse(options.body as string || '{}');
    const res = mockState.autoCheckin(campId, body.people_count || 1);
    return Promise.resolve(res as unknown as T);
  }
  if (endpoint.startsWith('/public/my-location-risk')) {
    const body = JSON.parse(options.body as string || '{}');
    return Promise.resolve({
      ...mockDefaultLocationRisk,
      user_lat: body.lat || mockDefaultLocationRisk.user_lat,
      user_lng: body.lng || mockDefaultLocationRisk.user_lng
    } as unknown as T);
  }
  if (endpoint.startsWith('/public/announcements')) return Promise.resolve(mockState.announcements as unknown as T);
  if (endpoint.startsWith('/public/forecast')) return Promise.resolve(mockState.forecast as unknown as T);
  if (endpoint.startsWith('/public/zones')) {
    return Promise.resolve(mockZoneGeoJson as unknown as T);
  }
  if (endpoint.startsWith('/public/assistant')) {
    const body = JSON.parse(options.body as string || '{}');
    return Promise.resolve({
      answer: `GCC AI Assistant: Adyar River at 4.65m. 6 relief shelters active across Velachery, Guindy, Saidapet, and Tambaram. Dial 1913 or 112 for urgent boat rescue.`,
      used_facts: ["Adyar Saidapet Telemetry (4.65m)", "6 Relief Camps Open", "IMD Doppler Radar"]
    } as unknown as T);
  }

  // Authority endpoints
  if (endpoint.startsWith('/authority/dashboard')) return Promise.resolve(mockState.dashboard as unknown as T);
  if (endpoint.startsWith('/authority/ai-brief')) return Promise.resolve(mockState.aiBrief as unknown as T);
  if (endpoint.startsWith('/authority/camps/live')) return Promise.resolve(mockState.liveBoard as unknown as T);
  if (endpoint.startsWith('/authority/camps') && method === 'GET') return Promise.resolve(mockState.camps as unknown as T);
  if (endpoint.startsWith('/authority/ai/camp-candidates')) return Promise.resolve(mockState.aiCampCandidates as unknown as T);
  if (endpoint.startsWith('/authority/ai/generate-announcement')) {
    const newDraft: Announcement = {
      id: `ann_ai_${Date.now()}`,
      title: "AI Flash Advisory: 68cm Inundation in Velachery & Mudichur",
      body: "Doppler radar measures 24.5cm rainfall accumulation. Citizens are advised to take the GST Road elevated corridor to Anna University CEG / Guru Nanak College shelters. Inflatable boats deployed.",
      level: "Evacuate",
      language: "en",
      published_at: new Date().toISOString(),
      published_by: "AI Emergency Operations Hub",
      target_zone: "Velachery & Mudichur",
      predicted_rain_cm: 24.5,
      predicted_flood_cm: 68.0,
      ai_suggested: true,
      confirmed_by_authority: false
    };
    mockState.announcements.unshift(newDraft);
    return Promise.resolve(newDraft as unknown as T);
  }
  if (endpoint.includes('/confirm') && endpoint.startsWith('/authority/announcements')) {
    const annId = endpoint.split('/')[3];
    const ann = mockState.announcements.find(a => a.id === annId);
    if (ann) {
      ann.confirmed_by_authority = true;
      ann.published_by = "Greater Chennai Corporation (GCC) Disaster Mgmt";
    }
    return Promise.resolve({ status: "confirmed_and_broadcast", id: annId } as unknown as T);
  }
  if (endpoint.startsWith('/authority/camps') && method === 'PATCH') {
    const campId = endpoint.split('/')[3];
    const body = JSON.parse(options.body as string || '{}');
    if (body.current_occupancy !== undefined) {
      mockState.updateCampOccupancy(campId, body.current_occupancy);
    }
    return Promise.resolve(mockState.camps.find(c => c.camp_id === campId) as unknown as T);
  }
  if (endpoint.startsWith('/authority/resources')) return Promise.resolve(mockState.resources as unknown as T);
  if (endpoint.startsWith('/authority/rescue-units')) return Promise.resolve(mockState.units as unknown as T);
  if (endpoint.startsWith('/authority/groups')) return Promise.resolve(mockState.groups as unknown as T);
  if (endpoint.startsWith('/authority/approvals') && method === 'GET') return Promise.resolve(mockState.approvals as unknown as T);
  if (endpoint.startsWith('/authority/approvals') && endpoint.includes('/decision')) {
    const parts = endpoint.split('/');
    const appId = parts[3];
    const body = JSON.parse(options.body as string || '{}');
    const app = mockState.approvals.find(a => a.id === appId);
    if (app) app.status = body.decision;
    return Promise.resolve(app as unknown as T);
  }
  if (endpoint.startsWith('/authority/loop')) return Promise.resolve(mockState.loop as unknown as T);
  if (endpoint.startsWith('/authority/predictions') && !endpoint.includes('explain')) {
    return Promise.resolve([
      { zone_id: "velachery", name: "Velachery & Pallikaranai", category: "Critical", probability: 0.86, rain_cm: 24.5, flood_depth_cm: 68.0, time_to_flood_hours: 1.5, p_3h: 0.88, p_6h: 0.92, p_12h: 0.78, expected_affected: 18500, confidence: 0.94, flooded_pct: 52.0 },
      { zone_id: "mudichur", name: "Mudichur & Varadharajapuram", category: "Critical", probability: 0.91, rain_cm: 28.0, flood_depth_cm: 75.0, time_to_flood_hours: 1.0, p_3h: 0.92, p_6h: 0.95, p_12h: 0.82, expected_affected: 14200, confidence: 0.95, flooded_pct: 60.0 },
      { zone_id: "saidapet", name: "Saidapet (Adyar Basin)", category: "High", probability: 0.74, rain_cm: 20.0, flood_depth_cm: 52.0, time_to_flood_hours: 2.5, p_3h: 0.76, p_6h: 0.82, p_12h: 0.65, expected_affected: 9800, confidence: 0.91, flooded_pct: 38.0 },
      { zone_id: "perumbakkam", name: "Perumbakkam & Medavakkam", category: "High", probability: 0.65, rain_cm: 18.0, flood_depth_cm: 42.0, time_to_flood_hours: 3.5, p_3h: 0.68, p_6h: 0.74, p_12h: 0.58, expected_affected: 6200, confidence: 0.89, flooded_pct: 28.0 },
      { zone_id: "kolathur", name: "Kolathur (Otteri Nullah)", category: "Medium", probability: 0.48, rain_cm: 15.0, flood_depth_cm: 28.0, time_to_flood_hours: 5.0, p_3h: 0.52, p_6h: 0.56, p_12h: 0.40, expected_affected: 3100, confidence: 0.88, flooded_pct: 18.0 }
    ] as unknown as T);
  }
  if (endpoint.startsWith('/authority/predictions') && endpoint.includes('explain')) {
    return Promise.resolve({
      features: [
        { name: "Adyar River Level", value: 4.65, contribution: 0.35 },
        { name: "Chembarambakkam Outflow", value: 12000, contribution: 0.26 },
        { name: "Doppler Rainfall (24h cm)", value: 24.5, contribution: 0.22 },
        { name: "Pallikaranai Marsh Elevation", value: 2.2, contribution: 0.17 }
      ]
    } as unknown as T);
  }
  if (endpoint.startsWith('/authority/events')) {
    return Promise.resolve(mockAgentEvents as unknown as T);
  }
  if (endpoint.startsWith('/authority/sim/results') || endpoint.startsWith('/authority/sim/run')) {
    return Promise.resolve({
      seeds_executed: 30,
      static_baseline: { avg_rescue_time_mins: 54.2, total_people_rescued: 4120, unserved_people: 1180, camp_overcrowding_events: 6.4, boat_utilization_pct: 68.5, replan_count: 0 },
      agentic_floodops: { avg_rescue_time_mins: 34.8, total_people_rescued: 5120, unserved_people: 180, camp_overcrowding_events: 0.2, boat_utilization_pct: 91.2, replan_count: 22 },
      improvement: { rescue_time_reduction_pct: 35.8, unserved_reduction_pct: 84.7, overcrowding_eliminated_pct: 96.9 },
      measured_at: new Date().toISOString()
    } as unknown as T);
  }

  // --- Admin Rescue Directives & Mission Orders ---
  if (endpoint.startsWith('/authority/rescue/directives')) {
    if (method === 'POST') {
      const body = JSON.parse(options.body as string || '{}');
      const newDirective: RescueDirective = {
        id: `DIR_${Date.now().toString(36).toUpperCase()}`,
        target_zone: body.target_zone || 'velachery',
        location_name: body.location_name || 'Submerged Area',
        lat: body.lat || 12.975,
        lng: body.lng || 80.220,
        people_count: body.people_count || 10,
        urgency: body.urgency || 'High',
        how_to_rescue: body.how_to_rescue || 'Deploy shallow draft motorized rescue craft along designated elevated corridors.',
        assigned_camp_id: body.assigned_camp_id || 'camp_guru_nanak',
        assigned_camp_name: body.assigned_camp_name || 'Relief Camp',
        equipment_needed: body.equipment_needed || ['Life Jackets', 'First Aid'],
        vulnerabilities: body.vulnerabilities || { children: 0, elderly: 0, medical: 0 },
        status: 'dispatched',
        dispatched_at: new Date().toISOString(),
        dispatched_by: 'District Collector Emergency Command'
      };
      mockState.directives.unshift(newDirective);
      offlineRecoveryService.saveRescueDirective(newDirective);
      return Promise.resolve(newDirective as unknown as T);
    }
    return Promise.resolve(mockState.directives as unknown as T);
  }

  // --- Camp Operator Portal Endpoints ---
  if (endpoint.startsWith('/operator/directives')) {
    if (endpoint.includes('/status') && method === 'PATCH') {
      const parts = endpoint.split('/');
      const dirId = parts[3];
      const body = JSON.parse(options.body as string || '{}');
      const dir = mockState.directives.find(d => d.id === dirId);
      if (dir) {
        dir.status = body.status || dir.status;
        if (body.operator_notes) dir.operator_notes = body.operator_notes;
        if (body.arrived_count !== undefined) dir.arrived_count = body.arrived_count;
        offlineRecoveryService.updateDirectiveStatus(dirId, dir.status, dir.operator_notes, dir.arrived_count);
      }
      return Promise.resolve(dir as unknown as T);
    }
    return Promise.resolve(mockState.directives as unknown as T);
  }

  if (endpoint.startsWith('/operator/camps') && endpoint.includes('/headcount')) {
    const parts = endpoint.split('/');
    const campId = parts[3];
    const body = JSON.parse(options.body as string || '{}');
    const report: CampHeadcountReport = {
      report_id: `rep_${Date.now()}`,
      camp_id: campId,
      camp_name: body.camp_name || 'Relief Shelter',
      operator_id: body.operator_id || 'u_operator_01',
      operator_name: body.operator_name || 'Camp In-Charge',
      total_occupancy: body.total_occupancy || 0,
      capacity: body.capacity || 1500,
      newly_arrived: body.newly_arrived || 0,
      discharged: body.discharged || 0,
      breakdown: body.breakdown || { men: 0, women: 0, children: 0, seniors: 0, medical_patients: 0 },
      supplies: body.supplies || { meals_remaining: 1000, water_liters_remaining: 3000, blankets: 200, medical_kits: 40 },
      urgent_needs: body.urgent_needs || [],
      reported_at: new Date().toISOString(),
      synced: true
    };
    mockState.submitHeadcount(report);
    offlineRecoveryService.submitHeadcountReport(report);
    return Promise.resolve({ success: true, report } as unknown as T);
  }

  if (endpoint.startsWith('/operator/announcements')) {
    return Promise.resolve(mockState.announcements as unknown as T);
  }

  // --- Offline Recovery Route & Camp Finder ---
  if (endpoint.startsWith('/offline/routes/calculate')) {
    const body = JSON.parse(options.body as string || '{}');
    return offlineRecoveryService.calculateOfflineRoute(
      body.origin || { name: 'User Current Location', lat: 12.975, lng: 80.220 },
      body.destination_camp_id || 'camp_guru_nanak'
    ) as unknown as Promise<T>;
  }

  if (endpoint.startsWith('/offline/camps/nearest')) {
    const body = JSON.parse(options.body as string || '{}');
    return offlineRecoveryService.findNearestCampsOffline(body.lat || 12.975, body.lng || 80.220) as unknown as Promise<T>;
  }

  return Promise.resolve({} as T);
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
