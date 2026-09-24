"""
FloodOps REST API v1.
Implements the shared contract specification from docs/CONTRACT.md.
All responses follow the standard response envelope:
{ "data": ..., "meta": { "server_time": "...", "as_of": "...", "demo": true } }
"""
from datetime import datetime, timezone
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Response
from sqlalchemy.orm import Session

from app.models.models import (
    get_db, User, Device, Place, FloodZone, FloodPrediction, Camp, CampState,
    EvacuationGroup, ResourceStock, RescueResource, RescueMission, Road, RoadReport,
    WeatherObservation, RiverReading, Recommendation, Communication, AuthorityInstruction,
    SyncEvent, SyncConflict, AuditLog, AgentEvent
)
from app.deps import get_current_user, get_current_user_optional, require_role, check_camp_access
from app.security import create_access_token, create_refresh_token, verify_password
from app.core.freshness import make_envelope, compute_effective_road_status, DEFAULT_FRESHNESS_THRESHOLDS
from app.core.audit import verify_audit_chain
from app.services.sync import process_push_events, get_pull_events, log_audit_entry
from app.services.routing import find_shortest_route
from app.services.redirect import calculate_split_allocation
from app.services.radio_script import generate_radio_script_for_recommendation, generate_radio_script_for_instruction
from app.services.fieldsheet import generate_camp_field_sheet_html
from app.services.recommendations import decide_recommendation, validate_constraints
from app.adapters.weather import weather_adapter
from app.adapters.river import river_adapter

router = APIRouter(prefix="/v1")

def wrap_res(data: Any, as_of: Optional[str] = None) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "data": data,
        "meta": {
            "server_time": now_iso,
            "as_of": as_of or now_iso,
            "demo": True
        }
    }

# ----------------- Health & Bootstrap -----------------
@router.get("/health")
def health_check():
    """Cheap, unauthenticated connectivity check for offline PWA clients."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/bootstrap")
def get_bootstrap_package(db: Session = Depends(get_db)):
    """Everything needed for client to work completely offline."""
    camps = db.query(Camp).all()
    states = {s.camp_id: s for s in db.query(CampState).all()}
    camps_data = []
    for c in camps:
        st = states.get(c.camp_id)
        camps_data.append({
            "camp_id": c.camp_id,
            "name": c.name,
            "capacity": c.capacity,
            "lat": c.lat,
            "lng": c.lng,
            "status": c.status,
            "occupied": st.occupied if st else 0,
            "reserved": st.reserved if st else 0,
            "projected": st.projected if st else 0,
            "available": st.available if st else c.capacity,
            "fill_band": st.fill_band if st else "GREEN",
            "resources": st.resources if st else {}
        })

    roads = db.query(Road).all()
    roads_data = [
        {"road_id": r.road_id, "from": r.from_node, "to": r.to_node, "length_km": r.length_km, "status": r.status}
        for r in roads
    ]

    zones = db.query(FloodZone).all()
    zones_data = [
        {"zone_id": z.zone_id, "name": z.name, "elevation": z.elevation, "population": z.population, "risk_band": z.risk_band}
        for z in zones
    ]

    places = db.query(Place).all()
    places_data = [
        {"place_id": p.place_id, "name": p.name, "type": p.type, "lat": p.lat, "lng": p.lng, "zone_id": p.zone_id}
        for p in places
    ]

    instructions = db.query(AuthorityInstruction).all()
    instructions_data = [
        {"id": i.id, "title": i.title, "body": i.body, "severity": i.severity, "target_zones": i.target_zones, "radio_script": i.radio_script}
        for i in instructions
    ]

    last_evt = db.query(SyncEvent).order_by(SyncEvent.server_seq.desc()).first()
    cursor = last_evt.server_seq if last_evt else 0

    return wrap_res({
        "camps": camps_data,
        "roads": roads_data,
        "zones": zones_data,
        "places": places_data,
        "instructions": instructions_data,
        "cursor": cursor,
        "thresholds": DEFAULT_FRESHNESS_THRESHOLDS
    })

# ----------------- Auth & Devices -----------------
@router.post("/auth/login")
def login(payload: Dict[str, str] = Body(...), db: Session = Depends(get_db)):
    email = payload.get("email")
    password = payload.get("password")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})

    log_audit_entry(db, "LOGIN", user.id, "auth", {"email": email, "role": user.role})

    return wrap_res({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "camp_ids": user.camp_ids or [],
            "team_ids": user.team_ids or []
        }
    })

@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return wrap_res({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "camp_ids": current_user.camp_ids or [],
        "team_ids": current_user.team_ids or []
    })

@router.post("/auth/devices/enroll")
def enroll_device(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    device_id = payload.get("device_id")
    name = payload.get("name", "Shared Tablet")
    if not device_id:
        raise HTTPException(status_code=400, detail="Missing device_id")
    
    dev = db.query(Device).filter(Device.device_id == device_id).first()
    if not dev:
        dev = Device(device_id=device_id, name=name, enrolled_by_user_id=current_user.id)
        db.add(dev)
    else:
        dev.name = name
        dev.last_seen_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_entry(db, "ENROLL_DEVICE", current_user.id, device_id, {"name": name})
    return wrap_res({"enrolled": True, "device_id": device_id, "name": name})

# ----------------- Offline Sync Protocol -----------------
@router.post("/sync/push")
def push_events(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    device_id = payload.get("device_id", "UNKNOWN-DEV")
    events = payload.get("events", [])
    results, cursor = process_push_events(db, device_id, events)
    return wrap_res({
        "device_id": device_id,
        "results": results,
        "server_cursor": cursor
    })

@router.get("/sync/pull")
def pull_events(since: int = Query(0), limit: int = Query(1000), db: Session = Depends(get_db)):
    res = get_pull_events(db, since_cursor=since, limit=limit)
    return wrap_res(res)

@router.get("/sync/status")
def sync_status(db: Session = Depends(get_db)):
    last_evt = db.query(SyncEvent).order_by(SyncEvent.server_seq.desc()).first()
    cursor = last_evt.server_seq if last_evt else 0
    conflicts_count = db.query(SyncConflict).filter(SyncConflict.resolved == False).count()
    return wrap_res({
        "server_cursor": cursor,
        "unresolved_conflicts": conflicts_count,
        "server_time": datetime.now(timezone.utc).isoformat()
    })

@router.get("/sync/conflicts")
def get_conflicts(db: Session = Depends(get_db)):
    conflicts = db.query(SyncConflict).filter(SyncConflict.resolved == False).all()
    data = [
        {
            "id": c.id,
            "event_id": c.event_id,
            "conflict_type": c.conflict_type,
            "details": c.details,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in conflicts
    ]
    return wrap_res(data)

@router.post("/sync/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conflict = db.query(SyncConflict).filter(SyncConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    strategy = payload.get("strategy", "MANUAL_OVERRIDE")
    conflict.resolved = True
    conflict.resolved_by = current_user.id
    conflict.resolved_at = datetime.now(timezone.utc)
    conflict.resolution_strategy = strategy
    db.commit()

    log_audit_entry(db, "RESOLVE_CONFLICT", current_user.id, conflict_id, {"strategy": strategy})
    return wrap_res({"resolved": True, "conflict_id": conflict_id, "strategy": strategy})

# ----------------- Camps & Occupancy -----------------
@router.get("/camps")
def list_camps(db: Session = Depends(get_db)):
    camps = db.query(Camp).all()
    states = {s.camp_id: s for s in db.query(CampState).all()}
    out = []
    for c in camps:
        st = states.get(c.camp_id)
        occ = st.occupied if st else 0
        cap = c.capacity
        out.append({
            "camp_id": c.camp_id,
            "name": c.name,
            "capacity": cap,
            "lat": c.lat,
            "lng": c.lng,
            "status": c.status,
            "occupied": make_envelope(occ, "camp_occupancy", st.last_updated_at if st else None, f"camp:{c.camp_id}"),
            "reserved": st.reserved if st else 0,
            "projected": st.projected if st else occ,
            "available": st.available if st else max(0, cap - occ),
            "fill_band": st.fill_band if st else "GREEN",
            "risk_level": c.risk_level
        })
    return wrap_res(out)

@router.get("/camps/{camp_id}")
def get_camp(camp_id: str, db: Session = Depends(get_db)):
    camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")
    st = db.query(CampState).filter(CampState.camp_id == camp_id).first()
    occ = st.occupied if st else 0
    return wrap_res({
        "camp_id": camp.camp_id,
        "name": camp.name,
        "capacity": camp.capacity,
        "lat": camp.lat,
        "lng": camp.lng,
        "status": camp.status,
        "occupied": make_envelope(occ, "camp_occupancy", st.last_updated_at if st else None, f"camp:{camp.camp_id}"),
        "reserved": st.reserved if st else 0,
        "projected": st.projected if st else occ,
        "available": st.available if st else max(0, camp.capacity - occ),
        "fill_band": st.fill_band if st else "GREEN",
        "resources": st.resources if st else {},
        "risk_level": camp.risk_level,
        "contact_name": camp.contact_name,
        "contact_phone": camp.contact_phone
    })

@router.post("/camps/{camp_id}/occupancy")
def update_camp_occupancy(
    camp_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_camp_access(camp_id, current_user)
    delta = payload.get("delta", 0)
    event_type = "CAMP_ARRIVAL" if delta >= 0 else "CAMP_DEPARTURE"

    evt = {
        "event_id": str(uuid.uuid4()),
        "device_id": payload.get("device_id", "web-console"),
        "user_id": current_user.id,
        "seq": 1,
        "type": event_type,
        "entity_id": camp_id,
        "payload": {"count": abs(delta)},
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "recorded_at": datetime.now(timezone.utc).isoformat()
    }
    results, cursor = process_push_events(db, evt["device_id"], [evt])
    res = results[0]
    if res["result"] == "CONFLICT":
        raise HTTPException(status_code=409, detail=f"Conflict: {res['reason']}")

    st = db.query(CampState).filter(CampState.camp_id == camp_id).first()
    return wrap_res({
        "camp_id": camp_id,
        "occupied": st.occupied if st else 0,
        "fill_band": st.fill_band if st else "GREEN",
        "event_result": res
    })

@router.get("/camps/{camp_id}/field-sheet")
def get_field_sheet(camp_id: str, db: Session = Depends(get_db)):
    camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")
    st = db.query(CampState).filter(CampState.camp_id == camp_id).first()
    inbound = db.query(EvacuationGroup).filter(
        EvacuationGroup.assigned_camp_id == camp_id,
        EvacuationGroup.status.in_(["ASSIGNED", "IN_TRANSIT"])
    ).all()
    instructions = db.query(AuthorityInstruction).all()

    html = generate_camp_field_sheet_html(
        camp={"camp_id": camp.camp_id, "name": camp.name, "capacity": camp.capacity, "contact_name": camp.contact_name},
        camp_state={"occupied": st.occupied if st else 0, "reserved": st.reserved if st else 0, "projected": st.projected if st else 0, "available": st.available if st else camp.capacity, "status": camp.status},
        inbound_groups=[{"group_id": g.group_id, "count_likely": g.count_likely, "count_min": g.count_min, "count_max": g.count_max, "source_zone_id": g.source_zone_id, "status": g.status} for g in inbound],
        instructions=[{"title": i.title, "body": i.body, "severity": i.severity} for i in instructions]
    )
    return Response(content=html, media_type="text/html")

# ----------------- Groups & Evacuation -----------------
@router.get("/evacuation-groups")
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(EvacuationGroup).all()
    data = [
        {
            "group_id": g.group_id,
            "count_min": g.count_min,
            "count_likely": g.count_likely,
            "count_max": g.count_max,
            "vulnerability": g.vulnerability,
            "status": g.status,
            "assigned_camp_id": g.assigned_camp_id,
            "source_zone_id": g.source_zone_id,
            "location_name": g.location_name,
            "location_source": g.location_source,
            "last_contact_at": g.last_contact_at.isoformat() if g.last_contact_at else None
        }
        for g in groups
    ]
    return wrap_res(data)

@router.post("/evacuation-groups")
def create_group(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gid = payload.get("group_id") or f"grp_{uuid.uuid4().hex[:6]}"
    grp = EvacuationGroup(
        group_id=gid,
        count_min=payload.get("count_min", 40),
        count_likely=payload.get("count_likely", 50),
        count_max=payload.get("count_max", 60),
        vulnerability=payload.get("vulnerability", {}),
        status="IDENTIFIED",
        source_zone_id=payload.get("source_zone_id", "ZONE-2"),
        location_name=payload.get("location_name", "Local Landmark"),
        location_source=payload.get("location_source", "MANUAL_ZONE")
    )
    db.add(grp)
    db.commit()
    return wrap_res({"group_id": grp.group_id, "status": grp.status})

@router.post("/evacuation-groups/{group_id}/assign")
def assign_group(group_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grp = db.query(EvacuationGroup).filter(EvacuationGroup.group_id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found")
    camp_id = payload.get("camp_id")
    grp.assigned_camp_id = camp_id
    grp.status = "ASSIGNED"

    # Emit GROUP_ASSIGNED event
    evt = {
        "event_id": str(uuid.uuid4()),
        "device_id": "control-console",
        "user_id": current_user.id,
        "seq": 1,
        "type": "GROUP_ASSIGNED",
        "entity_id": camp_id,
        "payload": {"count": grp.count_likely, "group_id": group_id}
    }
    process_push_events(db, "control-console", [evt])
    db.commit()
    return wrap_res({"group_id": group_id, "status": "ASSIGNED", "camp_id": camp_id})

@router.post("/evacuation-groups/{group_id}/arrive")
def arrive_group(group_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grp = db.query(EvacuationGroup).filter(EvacuationGroup.group_id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found")
    camp_id = grp.assigned_camp_id or payload.get("camp_id", "camp_A")
    check_camp_access(camp_id, current_user)

    grp.status = "ARRIVED"
    evt = {
        "event_id": str(uuid.uuid4()),
        "device_id": "camp-console",
        "user_id": current_user.id,
        "seq": 1,
        "type": "GROUP_ARRIVED",
        "entity_id": camp_id,
        "payload": {"count": grp.count_likely, "group_id": group_id}
    }
    results, _ = process_push_events(db, "camp-console", [evt])
    db.commit()
    return wrap_res({"group_id": group_id, "status": "ARRIVED", "result": results[0]})

# ----------------- Routing & Flood -----------------
@router.post("/routes")
def calculate_route(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    origin = payload.get("origin")
    destination = payload.get("destination")
    avoid = payload.get("avoid", [])

    roads = db.query(Road).all()
    nodes = set()
    edges = []
    for r in roads:
        nodes.add(r.from_node)
        nodes.add(r.to_node)
        edges.append({
            "from": r.from_node,
            "to": r.to_node,
            "length_km": r.length_km,
            "status": r.status
        })

    res = find_shortest_route(list(nodes), edges, origin, destination)
    return wrap_res(res)

@router.get("/flood/zones")
def list_zones(db: Session = Depends(get_db)):
    zones = db.query(FloodZone).all()
    data = [
        {
            "zone_id": z.zone_id,
            "name": z.name,
            "elevation": z.elevation,
            "population": z.population,
            "risk_band": z.risk_band,
            "confidence": z.confidence
        }
        for z in zones
    ]
    return wrap_res(data)

# ----------------- Recommendations & AI -----------------
@router.get("/ai/recommendations")
def list_recommendations(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).order_by(Recommendation.created_at.desc()).all()
    data = [
        {
            "id": r.id,
            "kind": r.kind,
            "decision_status": r.decision_status,
            "delivery_status": r.delivery_status,
            "proposal": r.proposal,
            "explanation": r.explanation,
            "inputs": r.inputs,
            "constraints": r.constraints,
            "overall": r.overall,
            "valid_until": r.valid_until.isoformat() if r.valid_until else None,
            "snapshot_hash": r.snapshot_hash,
            "radio_script": r.radio_script
        }
        for r in recs
    ]
    return wrap_res(data)

@router.post("/ai/recommendations/{rec_id}/decide")
def decide_rec(
    rec_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decision = payload.get("decision", "APPROVED") # APPROVED | REJECTED
    override_reason = payload.get("override_reason")
    snapshot_hash = payload.get("snapshot_hash")

    ok, msg, res = decide_recommendation(
        db=db,
        rec_id=rec_id,
        decision=decision,
        user_id=current_user.id,
        user_role=current_user.role,
        override_reason=override_reason,
        provided_snapshot_hash=snapshot_hash
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    log_audit_entry(db, f"DECIDE_{decision}", current_user.id, rec_id, {"reason": override_reason})
    return wrap_res(res)

@router.post("/ai/recommendations/{rec_id}/communicate")
def communicate_rec(
    rec_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    channel = payload.get("channel", "RADIO")
    status_step = payload.get("status", "COMMUNICATED") # COMMUNICATED | ACKNOWLEDGED | CONFIRMED
    rec.delivery_status = status_step
    db.commit()

    log_audit_entry(db, f"COMMUNICATE_{status_step}", current_user.id, rec_id, {"channel": channel})
    return wrap_res({"id": rec_id, "delivery_status": rec.delivery_status, "channel": channel})

@router.post("/ai/explain")
def explain_recommendation(payload: Dict[str, Any] = Body(...)):
    """Read-only deterministic explanation fallback (Contract B5)."""
    rec = payload.get("recommendation", {})
    explanation = rec.get("explanation", {})
    return wrap_res({
        "summary": explanation.get("summary", "Optimization balancing capacity and route safety."),
        "score_breakdown": explanation.get("score_breakdown", []),
        "provider": "deterministic-rules"
    })

# ----------------- Dashboard & Audit -----------------
@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    camps = db.query(CampState).all()
    total_occupied = sum(c.occupied for c in camps)
    total_capacity = sum(c.capacity for c in db.query(Camp).all())
    transit_groups = db.query(EvacuationGroup).filter(EvacuationGroup.status.in_(["ASSIGNED", "IN_TRANSIT"])).count()
    blocked_roads = db.query(Road).filter(Road.status == "BLOCKED").count()
    unresolved_conflicts = db.query(SyncConflict).filter(SyncConflict.resolved == False).count()

    return wrap_res({
        "people_sheltered": total_occupied,
        "total_capacity": total_capacity,
        "groups_in_transit": transit_groups,
        "blocked_roads": blocked_roads,
        "unresolved_conflicts": unresolved_conflicts
    })

@router.get("/audit")
def list_audit(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    data = [
        {
            "id": l.id,
            "prev_hash": l.prev_hash,
            "hash": l.hash,
            "action": l.action,
            "actor_id": l.actor_id,
            "target": l.target,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "details": l.details
        }
        for l in logs
    ]
    return wrap_res(data)

@router.get("/audit/verify")
def verify_audit(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    entries = [
        {
            "prev_hash": l.prev_hash,
            "hash": l.hash,
            "action": l.action,
            "actor_id": l.actor_id,
            "target": l.target,
            "timestamp": l.timestamp.isoformat() if l.timestamp else "",
            "details": l.details
        }
        for l in logs
    ]
    is_valid, broken_idx, reason = verify_audit_chain(entries)
    return wrap_res({
        "verified": is_valid,
        "broken_at_index": broken_idx,
        "message": reason,
        "total_entries": len(entries)
    })

# ----------------- Simulation & Scenarios -----------------
@router.post("/simulation/toggle")
def toggle_simulation(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    target = payload.get("target") # weather, river, road_block, fill_camp
    value = payload.get("value")

    if target == "weather":
        weather_adapter.set_simulation(float(value))
    elif target == "river":
        river_adapter.set_stage("GAUGE-2", float(value), 0.4)
    elif target == "road_block":
        road_id = payload.get("road_id", "R12")
        road = db.query(Road).filter(Road.road_id == road_id).first()
        if road:
            road.status = "BLOCKED" if value else "SAFE"
            db.commit()
    elif target == "fill_camp":
        camp_id = payload.get("camp_id", "camp_A")
        st = db.query(CampState).filter(CampState.camp_id == camp_id).first()
        if st:
            st.occupied = int(value)
            db.commit()

    return wrap_res({"toggled": target, "value": value})
