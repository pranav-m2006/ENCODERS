from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

# Auth
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    district: str = "Alappuzha"
    language: str = "en"

class UserOut(BaseModel):
    id: str
    name: str
    role: str
    district: str
    language: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Public
class RiverInfo(BaseModel):
    level_m: float
    alert_level_m: float = 5.5
    trend: str = "rising" # rising | falling | steady

class AlertItem(BaseModel):
    id: str
    level: str # Critical | High | Medium | Low
    title: str
    zone_id: Optional[str] = None

class PublicSummary(BaseModel):
    overall_risk: str
    updated_at: str
    people_sheltered: int
    camps_open: int
    camps_total: int
    alerts: List[AlertItem]
    river: RiverInfo

class NearestCamp(BaseModel):
    camp_id: str
    name: str
    available: int
    status: str

class PublicAiUpdate(BaseModel):
    headline: str
    summary: str
    what_changed: List[str]
    what_to_do: List[str]
    nearest_camps: List[NearestCamp]
    generated_at: str
    data_freshness_minutes: int
    source: Literal["llm", "template"]
    disclaimer: str = "AI-generated from official data. Follow official announcements."

class FacilityDict(BaseModel):
    water: bool = True
    medical: bool = True
    toilets: bool = True
    power: bool = True
    food: bool = True
    baby_care: bool = True

class PublicCamp(BaseModel):
    camp_id: str
    name: str
    lat: float
    lng: float
    capacity: int
    available: int
    current_occupancy: int
    status: str
    facilities: FacilityDict
    contact: str
    updated_at: str
    updated_by_role: str
    geofence_radius_m: float = 150.0
    urgent_needs: List[str] = []
    meals_available: int = 2400
    water_liters_available: int = 7500
    blankets_available: int = 650
    medical_kits_available: int = 85

class PublicAnnouncement(BaseModel):
    id: str
    title: str
    body: str
    language: str
    level: str
    published_at: str
    published_by: str
    target_zone: Optional[str] = "All Chennai Zones"
    predicted_rain_cm: Optional[float] = None
    predicted_flood_cm: Optional[float] = None
    ai_suggested: bool = False
    confirmed_by_authority: bool = True

class RiverPoint(BaseModel):
    t: str
    level_m: float
    river_name: str = "Adyar River (Saidapet Bridge)"

class RainPoint(BaseModel):
    t: str
    mm: float
    cm: float

class ZoneForecast(BaseModel):
    zone_id: str
    name: str
    risk_level: str
    probability: float
    predicted_rain_cm: float
    predicted_flood_depth_cm: float
    time_to_flood_hours: float
    flooded_roads: List[str] = []
    safe_corridors: List[str] = []
    p_3h: float
    p_6h: float
    p_12h: float
    confidence: float

class PublicForecast(BaseModel):
    river_series: List[RiverPoint]
    rain_series: List[RainPoint]
    zone_forecast: List[ZoneForecast]
    overall_predicted_rain_cm: float = 18.5
    overall_predicted_flood_cm: float = 42.0
    limitations: str = "Hydrological prediction model for Greater Chennai. Continuously calibrated against Chembarambakkam reservoir outflow and CMWSSB radar."

class MyLocationRiskRequest(BaseModel):
    lat: float
    lng: float

class MyLocationRiskResponse(BaseModel):
    user_lat: float
    user_lng: float
    matched_zone_id: str
    matched_zone_name: str
    risk_level: str # Critical, High, Medium, Low
    probability_pct: float
    predicted_rain_cm: float
    predicted_flood_depth_cm: float
    time_to_flood_hours: float
    time_to_flood_display: str # e.g. "Onset expected in 2.5 hours"
    flooded_roads_nearby: List[str]
    safe_corridors: List[str]
    nearest_camp: Dict[str, Any]
    advice: str

class AutoCheckinRequest(BaseModel):
    camp_id: Optional[str] = None
    people_count: int = 1
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    source_zone: Optional[str] = "Live GPS Check-in"

class AutoCheckinResponse(BaseModel):
    success: bool
    camp_id: str
    camp_name: str
    people_checked_in: int
    new_occupancy: int
    capacity: int
    remaining_capacity: int
    status: str
    updated_meals_remaining: int
    updated_water_liters: int
    message: str

class AiCampCandidate(BaseModel):
    candidate_id: str
    name: str
    area: str
    lat: float
    lng: float
    suggested_capacity: int
    building_type: str # School, Community Hall, Indoor Stadium, College Campus
    proximity_to_flood: str
    elevation_m: float
    suitability_score: float
    recommended_reason: str

class AssistantRequest(BaseModel):
    question: str
    lang: str = "en"
    zone_id: Optional[str] = None

class AssistantResponse(BaseModel):
    answer: str
    used_facts: List[str]

# Authority
class AuthorityDashboard(BaseModel):
    affected_population: int
    flooded_km2: float
    active_units: int
    camps_open: int
    camps_total: int
    people_sheltered: int
    unserved: int
    replans: int
    over_capacity_events: int

class RecommendedAction(BaseModel):
    approval_id: str
    type: str
    text: str
    reason: str
    confidence: float

class ZonePriority(BaseModel):
    zone_id: str
    reason: str

class AuthorityAiBrief(BaseModel):
    headline: str
    summary: str
    risks: List[str]
    priorities: List[ZonePriority]
    recommended_actions: List[RecommendedAction]
    shortages: List[str]
    generated_at: str
    source: Literal["llm", "template"]

class CampCreate(BaseModel):
    camp_id: Optional[str] = None
    name: str
    lat: float
    lng: float
    capacity: int
    current_occupancy: int = 0
    facilities: Optional[FacilityDict] = None
    contact_name: Optional[str] = "Camp Coordinator"
    contact_phone: Optional[str] = "+91 94470 12345"
    notes: Optional[str] = ""

class CampPatch(BaseModel):
    capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    occupancy_delta: Optional[int] = None
    status: Optional[str] = None
    facilities: Optional[FacilityDict] = None
    contact: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None

class CampTransferRequest(BaseModel):
    from_camp: str
    to_camp: str
    people: int

class ResourceUpdate(BaseModel):
    food: Optional[float] = None
    water: Optional[float] = None
    medicine: Optional[float] = None
    beds: Optional[float] = None
    fuel: Optional[float] = None

class SupplyRequestCreate(BaseModel):
    camp_id: str
    item: str
    quantity: float

class RescueDispatch(BaseModel):
    unit_id: str
    zone_id: str

class GroupCreate(BaseModel):
    name: Optional[str] = "NDRF Unit"
    source_zone: str
    population: int
    group_type: Literal["boat", "ground_team", "air_supply", "high_truck"] = "boat"
    boats_count: int = 2
    personnel_count: int = 6
    air_drop_kits: int = 0
    vehicles_count: int = 1
    destination_camp: Optional[str] = None

class EvacuationGroupOut(BaseModel):
    group_id: str
    name: str
    source_zone: str
    group_type: str
    boats_count: int
    personnel_count: int
    air_drop_kits: int
    vehicles_count: int
    population: int
    current_location: str
    destination_camp: str
    status: str
    priority: float
    eta: str
    created_at: str

class RescueResourceOut(BaseModel):
    resource_id: str
    name: str
    type: str
    capacity: int
    personnel: int
    lat: float
    lng: float
    status: str
    assigned_zone: Optional[str] = None
    eta: str

class GroupStatusPatch(BaseModel):
    status: Literal["waiting", "moving", "arrived"]

class ApprovalDecision(BaseModel):
    decision: Literal["approve", "reject", "modify"]
    note: Optional[str] = None
    override: Optional[Dict[str, Any]] = None

class AnnouncementDraftRequest(BaseModel):
    topic: str
    target_zone: Optional[str] = "All Chennai Zones"
    audience: str = "public"
    lang: str = "en"

class AnnouncementDraftResponse(BaseModel):
    title: str
    body: str
    target_zone: str
    predicted_rain_cm: float
    predicted_flood_cm: float
    level: str
    ai_rationale: str

class AnnouncementCreate(BaseModel):
    title: str
    body: str
    level: str = "Info"
    language: str = "en"
    target_zone: Optional[str] = "All Chennai Zones"
    predicted_rain_cm: Optional[float] = None
    predicted_flood_cm: Optional[float] = None
    ai_suggested: bool = False
    confirmed_by_authority: bool = True

class AiAnnouncementGenerateRequest(BaseModel):
    zone_id: Optional[str] = None
    severity: Optional[str] = "auto"
    language: str = "en"

class ObservationCreate(BaseModel):
    type: Literal["river", "rain", "flood_report"]
    zone_id: Optional[str] = None
    value: float
    note: Optional[str] = ""

class SimRunRequest(BaseModel):
    seeds: int = 30

class SimulateArrivalRequest(BaseModel):
    camp_id: str
    people: int

# Camp Live Board
class LiveBoardZone(BaseModel):
    zone_id: str
    name: str
    needing_evac: int

class LiveBoardGroup(BaseModel):
    group_id: str
    source_zone: str
    size: int
    status: str
    destination_camp: str
    eta: str

class LiveBoardCamp(BaseModel):
    camp_id: str
    name: str
    capacity: int
    occupancy: int
    inbound: int
    free: int
    status: str
    projected_pct: float
    hours_of_cover: float

class LiveBoardArrival(BaseModel):
    time: str
    size: int
    source_zone: str
    transport: str
    camp: str
    status: str

class LiveBoardData(BaseModel):
    zones: List[LiveBoardZone]
    groups: List[LiveBoardGroup]
    camps: List[LiveBoardCamp]
    arrivals: List[LiveBoardArrival]
    warnings: List[str]

class LoopStageResponse(BaseModel):
    stage: str
    message: str
    cycle_id: str
    timestamp: str
    recent_events: List[Dict[str, Any]] = []
