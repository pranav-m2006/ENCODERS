import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

Base = declarative_base()
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def utc_now():
    return datetime.now(timezone.utc)

# ----------------- Auth & Device Enrollment -----------------
class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="STAFF") # ADMIN, STAFF, PUBLIC
    camp_ids = Column(JSON, default=list) # Scoped camps for staff
    team_ids = Column(JSON, default=list) # Scoped teams for rescue staff
    district = Column(String(100), default="Baran River Basin")
    language = Column(String(10), default="en")
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

class Device(Base):
    __tablename__ = "devices"
    device_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    enrolled_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    enrolled_at = Column(DateTime, default=utc_now)
    last_seen_at = Column(DateTime, default=utc_now)
    revoked = Column(Boolean, default=False)

# ----------------- Spatial Gazetteer & Zones -----------------
class Place(Base):
    __tablename__ = "places"
    place_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), default="village") # village, landmark
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zone_id = Column(String(50), nullable=True)

class FloodZone(Base):
    __tablename__ = "flood_zones"
    zone_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    elevation = Column(Float, default=15.0) # meters
    population = Column(Integer, default=5000)
    geojson_geometry = Column(JSON, nullable=True)
    risk_band = Column(String(20), default="LOW") # LOW, MODERATE, HIGH, SEVERE
    confidence = Column(Float, default=1.0)
    current_probability = Column(Float, default=0.45)
    current_risk_category = Column(String(20), default="Moderate")
    flooded_pct = Column(Float, default=25.0)
    needing_evacuation = Column(Integer, default=1200)
    predicted_rain_cm = Column(Float, default=15.0)
    predicted_flood_depth_cm = Column(Float, default=35.0)
    time_to_flood_hours = Column(Float, default=3.0)
    centroid_lat = Column(Float, default=25.22)
    centroid_lng = Column(Float, default=76.52)
    flooded_roads = Column(JSON, default=list)
    safe_corridors = Column(JSON, default=list)
    satellite_water_fraction = Column(Float, default=0.15)
    low_lying_index = Column(Float, default=0.5)
    advice = Column(Text, default="Move to higher ground if in low-lying area.")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class FloodPrediction(Base):
    __tablename__ = "flood_predictions"
    id = Column(String(50), primary_key=True, default=lambda: f"pred_{uuid.uuid4().hex[:8]}")
    zone_id = Column(String(50), ForeignKey("flood_zones.zone_id"), nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_band = Column(String(20), nullable=False) # LOW, MODERATE, HIGH, SEVERE
    confidence = Column(Float, default=0.90)
    affected_min = Column(Integer, default=0)
    affected_likely = Column(Integer, default=0)
    affected_max = Column(Integer, default=0)
    breakdown = Column(JSON, default=dict)
    generated_at = Column(DateTime, default=utc_now)

# ----------------- Camps & Occupancy Projections -----------------
class Camp(Base):
    __tablename__ = "camps"
    camp_id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    capacity = Column(Integer, default=1000)
    current_occupancy = Column(Integer, default=0)
    inbound_occupancy = Column(Integer, default=0)
    status = Column(String(20), default="open") # open, near_capacity, full, closed, unsafe, OPEN, FULL, etc.
    risk_level = Column(String(20), default="LOW")
    facilities = Column(JSON, default=lambda: {"water": True, "medical": True, "power": True, "food": True, "toilets": True, "baby_care": True})
    contact_name = Column(String(100), default="Camp Coordinator")
    contact_phone = Column(String(50), default="HF Radio CH-4")
    updated_by_role = Column(String(50), default="authority")
    geofence_radius_m = Column(Float, default=150.0)
    urgent_needs = Column(JSON, default=list)
    meals_available = Column(Integer, default=2000)
    water_liters_available = Column(Integer, default=6000)
    blankets_available = Column(Integer, default=500)
    medical_kits_available = Column(Integer, default=50)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class CampState(Base):
    """Derived projection table reconstructed from immutable event stream."""
    __tablename__ = "camp_state"
    camp_id = Column(String(50), ForeignKey("camps.camp_id"), primary_key=True)
    occupied = Column(Integer, default=0)
    reserved = Column(Integer, default=0)
    projected = Column(Integer, default=0)
    available = Column(Integer, default=1000)
    fill_band = Column(String(20), default="GREEN") # GREEN, AMBER, RED
    resources = Column(JSON, default=lambda: {"water_l": 15000, "food_meals": 3000, "beds": 1000, "medical_kits": 50})
    version = Column(Integer, default=1)
    last_updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class CampMovement(Base):
    __tablename__ = "camp_movements"
    movement_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    camp_id = Column(String(50), ForeignKey("camps.camp_id"), nullable=False)
    group_id = Column(String(50), nullable=True)
    people_count = Column(Integer, nullable=False)
    type = Column(String(20), default="ARRIVAL") # ARRIVAL | DEPARTURE
    status = Column(String(20), default="arrived")
    source_zone = Column(String(100), nullable=True)
    transport_type = Column(String(100), default="Camp Transfer Bus")
    occurred_at = Column(DateTime, default=utc_now)
    recorded_at = Column(DateTime, default=utc_now)

# ----------------- Groups & Evacuation -----------------
class EvacuationGroup(Base):
    __tablename__ = "evacuation_groups"
    group_id = Column(String(50), primary_key=True, default=lambda: f"grp_{uuid.uuid4().hex[:8]}")
    name = Column(String(100), default="Evacuation Group")
    source_zone = Column(String(50), nullable=True)
    source_zone_id = Column(String(50), ForeignKey("flood_zones.zone_id"), nullable=True)
    destination_camp = Column(String(50), nullable=True)
    assigned_camp_id = Column(String(50), ForeignKey("camps.camp_id"), nullable=True)
    group_type = Column(String(50), default="Boat Rescue")
    population = Column(Integer, default=50)
    count_min = Column(Integer, default=50)
    count_likely = Column(Integer, default=60)
    count_max = Column(Integer, default=70)
    boats_count = Column(Integer, default=1)
    personnel_count = Column(Integer, default=4)
    air_drop_kits = Column(Integer, default=0)
    vehicles_count = Column(Integer, default=1)
    eta = Column(String(50), default="15 mins")
    vulnerability = Column(JSON, default=lambda: {"elderly": 5, "children": 10, "disabled": 2, "medical": 1})
    status = Column(String(30), default="waiting") # IDENTIFIED, ASSIGNED, IN_TRANSIT, ARRIVED, waiting
    location_name = Column(String(100), default="Zone 2 North Hamlet")
    location_source = Column(String(30), default="MANUAL_ZONE")
    last_contact_at = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

# ----------------- Resources -----------------
class ResourceStock(Base):
    __tablename__ = "resources"
    camp_id = Column(String(50), ForeignKey("camps.camp_id"), primary_key=True)
    food = Column(Float, default=3000.0)
    water = Column(Float, default=15000.0)
    medicine = Column(Float, default=50.0)
    beds = Column(Float, default=800.0)
    fuel = Column(Float, default=250.0)
    food_meals = Column(Float, default=3000.0)
    water_liters = Column(Float, default=15000.0)
    medicine_kits = Column(Float, default=50.0)
    version = Column(Integer, default=1)
    last_updated = Column(DateTime, default=utc_now, onupdate=utc_now)

# ----------------- Rescue Operations -----------------
class RescueResource(Base):
    __tablename__ = "rescue_resources"
    team_id = Column(String(50), primary_key=True, default=lambda: f"TEAM-{uuid.uuid4().hex[:6]}")
    resource_id = Column(String(50), nullable=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), default="Boat Rescue")
    capacity = Column(Integer, default=8)
    personnel = Column(Integer, default=6)
    has_boat = Column(Boolean, default=True)
    status = Column(String(20), default="available") # available, in_transit, busy, assigned, offline
    lat = Column(Float, default=25.2)
    lng = Column(Float, default=76.5)
    assigned_zone = Column(String(50), nullable=True)
    assigned_mission_id = Column(String(50), nullable=True)
    eta = Column(String(50), default="15 mins")
    contact_channel = Column(String(50), default="VHF Channel 16")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    def __init__(self, **kwargs):
        if "team_id" not in kwargs and "resource_id" in kwargs:
            kwargs["team_id"] = kwargs["resource_id"]
        if "resource_id" not in kwargs and "team_id" in kwargs:
            kwargs["resource_id"] = kwargs["team_id"]
        super().__init__(**kwargs)

class RescueMission(Base):
    __tablename__ = "rescue_missions"
    mission_id = Column(String(50), primary_key=True, default=lambda: f"mis_{uuid.uuid4().hex[:8]}")
    priority_score = Column(Float, default=0.85)
    zone_id = Column(String(50), ForeignKey("flood_zones.zone_id"), nullable=False)
    people_count = Column(Integer, default=15)
    urgency = Column(String(20), default="HIGH")
    requires_boat = Column(Boolean, default=True)
    assigned_team_id = Column(String(50), ForeignKey("rescue_resources.team_id"), nullable=True)
    status = Column(String(20), default="PENDING") # PENDING, ASSIGNED, EN_ROUTE, ON_SCENE, COMPLETED, ABORTED
    created_at = Column(DateTime, default=utc_now)

# ----------------- Roads & Transportation -----------------
class Road(Base):
    __tablename__ = "roads"
    road_id = Column(String(50), primary_key=True)
    name = Column(String(100), default="Highway Route")
    from_node = Column(String(50), nullable=False)
    to_node = Column(String(50), nullable=False)
    length_km = Column(Float, default=5.0)
    status = Column(String(20), default="SAFE") # SAFE, CAUTION, BLOCKED, UNKNOWN
    last_report_at = Column(DateTime, default=utc_now)

class RoadReport(Base):
    __tablename__ = "road_reports"
    report_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    road_id = Column(String(50), ForeignKey("roads.road_id"), nullable=False)
    status = Column(String(20), nullable=False)
    reported_by = Column(String(100), default="Field Patrol")
    occurred_at = Column(DateTime, default=utc_now)
    recorded_at = Column(DateTime, default=utc_now)
    notes = Column(Text, default="")

# ----------------- Sensors & Weather -----------------
class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String(50), default="weather") # weather, rain, river
    value = Column(Float, default=38.5)
    temperature = Column(Float, default=28.5)
    rainfall_rate_mm = Column(Float, default=12.0)
    predicted_rain_6h_mm = Column(Float, default=45.0)
    source = Column(String(50), default="open_meteo")
    fetched_at = Column(DateTime, default=utc_now)

class RiverReading(Base):
    __tablename__ = "river_readings"
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    gauge_id = Column(String(50), nullable=False)
    gauge_name = Column(String(100), default="Midstream Gauge")
    stage_meters = Column(Float, default=8.4)
    rate_of_rise_m_per_h = Column(Float, default=0.25)
    warning_level_m = Column(Float, default=7.5)
    danger_level_m = Column(Float, default=9.0)
    fetched_at = Column(DateTime, default=utc_now)

# ----------------- AI Recommendations & Instructions -----------------
class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String(50), primary_key=True)
    kind = Column(String(50), nullable=False) # CAMP_REDIRECT, ROUTE_CHANGE, RESCUE_ASSIGN, etc.
    decision_status = Column(String(20), default="PROPOSED") # PROPOSED, APPROVED, REJECTED, SUPERSEDED, EXPIRED
    delivery_status = Column(String(20), default="NOT_SENT") # NOT_SENT, COMMUNICATED, ACKNOWLEDGED, CONFIRMED
    proposal = Column(JSON, default=dict)
    explanation = Column(JSON, default=dict)
    inputs = Column(JSON, default=list)
    constraints = Column(JSON, default=list)
    overall = Column(String(10), default="PASS") # PASS, WARN, FAIL
    valid_until = Column(DateTime, nullable=False)
    snapshot_hash = Column(String(64), nullable=False)
    delivery = Column(JSON, default=dict)
    radio_script = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String(50), nullable=True)
    override_reason = Column(Text, nullable=True)

class Communication(Base):
    __tablename__ = "communications"
    id = Column(String(50), primary_key=True, default=lambda: f"com_{uuid.uuid4().hex[:8]}")
    recommendation_id = Column(String(50), ForeignKey("recommendations.id"), nullable=False)
    channel = Column(String(50), default="RADIO") # RADIO, PA, IN_PERSON, LAN_APP, SMS
    sent_by = Column(String(50), nullable=False)
    sent_at = Column(DateTime, default=utc_now)
    ack_by = Column(String(50), nullable=True)
    ack_at = Column(DateTime, nullable=True)

class AuthorityInstruction(Base):
    __tablename__ = "authority_instructions"
    id = Column(String(50), primary_key=True, default=lambda: f"inst_{uuid.uuid4().hex[:8]}")
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    severity = Column(String(20), default="WARNING") # INFO, ADVISORY, WARNING, EVACUATE
    level = Column(String(20), default="Warning")
    language = Column(String(10), default="en")
    target_zone = Column(String(100), default="All Zones")
    target_zones = Column(JSON, default=list)
    predicted_rain_cm = Column(Float, default=15.0)
    predicted_flood_cm = Column(Float, default=35.0)
    ai_suggested = Column(Boolean, default=False)
    confirmed_by_authority = Column(Boolean, default=True)
    retracted = Column(Boolean, default=False)
    radio_script = Column(Text, default="")
    published_by = Column(String(100), default="District Disaster Authority")
    published_at = Column(DateTime, default=utc_now)

class RescueDirective(Base):
    __tablename__ = "rescue_directives"
    id = Column(String(50), primary_key=True, default=lambda: f"dir_{uuid.uuid4().hex[:8]}")
    target_zone = Column(String(100), default="ZONE-2")
    location_name = Column(String(150), default="Lowland Sector")
    lat = Column(Float, default=25.20)
    lng = Column(Float, default=76.50)
    people_count = Column(Integer, default=25)
    arrived_count = Column(Integer, default=0)
    urgency = Column(String(20), default="Critical")
    how_to_rescue = Column(Text, default="")
    assigned_camp_id = Column(String(50), default="camp_01")
    assigned_camp_name = Column(String(150), default="Relief Camp")
    equipment_needed = Column(JSON, default=list)
    vulnerabilities = Column(JSON, default=lambda: {"children": 5, "elderly": 4, "medical": 1})
    status = Column(String(30), default="assigned") # assigned, in_transit, arrived, completed
    operator_notes = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

# ----------------- Event Log & Offline Sync Engine -----------------
class SyncEvent(Base):
    """
    Append-only immutable event log.
    The single source of truth for the entire operational state.
    """
    __tablename__ = "sync_events"
    server_seq = Column(Integer, primary_key=True, autoincrement=True) # Monotonic pull cursor
    event_id = Column(String(50), unique=True, index=True, nullable=False)
    device_id = Column(String(50), nullable=False)
    user_id = Column(String(50), nullable=False)
    seq = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    payload = Column(JSON, default=dict)
    occurred_at = Column(DateTime, nullable=False)
    recorded_at = Column(DateTime, nullable=False)
    hlc = Column(String(100), nullable=False)
    base_version = Column(Integer, nullable=True)
    received_at = Column(DateTime, default=utc_now)
    origin_node = Column(String(50), default="central")
    result = Column(String(20), default="APPLIED") # APPLIED, DUPLICATE, CONFLICT, REJECTED
    conflict_id = Column(String(50), nullable=True)

class SyncConflict(Base):
    __tablename__ = "sync_conflicts"
    id = Column(String(50), primary_key=True, default=lambda: f"conf_{uuid.uuid4().hex[:8]}")
    event_id = Column(String(50), nullable=False)
    conflict_type = Column(String(50), nullable=False) # NEGATIVE_OCCUPANCY, DOUBLE_ARRIVAL, STOCKTAKE_MISMATCH, STALE_DECISION, UNAUTHORIZED_ORIGIN, CLOCK_SKEW
    details = Column(JSON, default=dict)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(String(50), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_strategy = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

# ----------------- Audit & Agent Monitoring -----------------
class AuditLog(Base):
    """Append-only, hash-chained log."""
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)
    action = Column(String(50), nullable=False)
    actor_id = Column(String(50), nullable=False)
    target = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    details = Column(JSON, default=dict)

class AgentEvent(Base):
    __tablename__ = "agent_events"
    id = Column(String(50), primary_key=True, default=lambda: f"agevt_{uuid.uuid4().hex[:8]}")
    agent_name = Column(String(50), nullable=False)
    status = Column(String(20), default="HEALTHY")
    action = Column(String(100), nullable=False)
    message = Column(Text, default="")
    input_summary = Column(Text, default="")
    output_summary = Column(Text, default="")
    related_zone = Column(String(50), nullable=True)
    related_resource = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=utc_now)

# Aliases for backwards compatibility with legacy routes
Zone = FloodZone
Prediction = FloodPrediction
Observation = WeatherObservation
Announcement = AuthorityInstruction

class SupplyRequest(Base):
    __tablename__ = "supply_requests"
    id = Column(String(50), primary_key=True, default=lambda: f"req_{uuid.uuid4().hex[:8]}")
    camp_id = Column(String(50), ForeignKey("camps.camp_id"), nullable=False)
    item = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String(20), default="pending")
    created_by = Column(String(100), default="AI Resource Optimization Agent")
    created_at = Column(DateTime, default=utc_now)

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(String(50), primary_key=True, default=lambda: f"app_{uuid.uuid4().hex[:8]}")
    type = Column(String(50), nullable=False)
    payload = Column(JSON, default=dict)
    reason = Column(Text, nullable=False)
    confidence = Column(Float, default=0.92)
    status = Column(String(20), default="pending")
    decided_by = Column(String(100), nullable=True)
    decision_note = Column(Text, nullable=True)
    override = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    decided_at = Column(DateTime, nullable=True)

class SimResult(Base):
    __tablename__ = "sim_results"
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_at = Column(DateTime, default=utc_now)
    metrics = Column(JSON, nullable=False)

class AiBrief(Base):
    __tablename__ = "ai_briefs"
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    audience = Column(String(20), nullable=False)
    lang = Column(String(10), default="en")
    content = Column(JSON, nullable=False)
    source = Column(String(20), default="template")
    generated_at = Column(DateTime, default=utc_now)
    input_hash = Column(String(64), nullable=True)


