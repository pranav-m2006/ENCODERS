import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.models.models import (
    get_db, Camp, Zone, EvacuationGroup, CampMovement, ResourceStock,
    SupplyRequest, RescueResource, Observation, Prediction, Approval,
    Announcement, AgentEvent, SimResult, User, RescueDirective
)
from app.schemas.schemas import (
    AuthorityDashboard, AuthorityAiBrief, CampCreate, CampPatch, CampTransferRequest,
    ResourceUpdate, SupplyRequestCreate, RescueDispatch, GroupCreate, GroupStatusPatch,
    ApprovalDecision, AnnouncementDraftRequest, AnnouncementDraftResponse,
    AnnouncementCreate, ObservationCreate, SimRunRequest, SimulateArrivalRequest,
    LiveBoardData, LiveBoardZone, LiveBoardGroup, LiveBoardCamp, LiveBoardArrival,
    LoopStageResponse, AssistantRequest, AssistantResponse
)
from app.deps import require_authority
from app.services.state import state_manager
from app.services.briefing import briefing_service
from app.services.assistant import assistant_service
from app.services.simulation import simulation_service
from app.agents.coordinator import coordinator
from app.ml.predict import predict_risk
from app.ml.demand import calculate_hours_of_cover
from app.core.bus import bus

router = APIRouter(prefix="/authority", tags=["Authority"], dependencies=[Depends(require_authority)])

@router.get("/dashboard", response_model=AuthorityDashboard)
def get_dashboard(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    camps = db.query(Camp).all()
    units = db.query(RescueResource).all()

    affected = sum([int(z.population * z.current_probability) for z in zones])
    flooded_km2 = round(sum([z.flooded_pct * 0.45 for z in zones]), 1)
    active_units = len([u for u in units if u.status in ["in_transit", "busy"]])
    camps_open = len([c for c in camps if c.status != "closed"])
    sheltered = sum([c.current_occupancy for c in camps])
    unserved = sum([z.needing_evacuation for z in zones])
    over_capacity = len([c for c in camps if c.current_occupancy + c.inbound_occupancy >= int(c.capacity * 0.9)])

    return AuthorityDashboard(
        affected_population=affected,
        flooded_km2=flooded_km2,
        active_units=active_units,
        camps_open=camps_open,
        camps_total=len(camps),
        people_sheltered=sheltered,
        unserved=unserved,
        replans=coordinator.cycle_count,
        over_capacity_events=over_capacity
    )

@router.get("/ai-brief", response_model=AuthorityAiBrief)
async def get_ai_brief(db: Session = Depends(get_db)):
    brief = await briefing_service.get_authority_ai_brief(db)
    return brief

@router.get("/camps")
def list_camps(db: Session = Depends(get_db)):
    return db.query(Camp).all()

@router.post("/camps")
async def create_camp(req: CampCreate, current_user: User = Depends(require_authority), db: Session = Depends(get_db)):
    camp_id = req.camp_id or f"camp_{uuid.uuid4().hex[:6]}"
    camp = Camp(
        camp_id=camp_id,
        name=req.name,
        lat=req.lat,
        lng=req.lng,
        capacity=req.capacity,
        current_occupancy=req.current_occupancy,
        facilities=req.facilities.dict() if req.facilities else {"water": True, "medical": True, "toilets": True, "power": True, "food": True},
        contact_name=req.contact_name or "Camp Coordinator",
        contact_phone=req.contact_phone or "+91 94470 12345",
        notes=req.notes or "",
        updated_by_role="authority"
    )
    state_manager.update_camp_status_derived(camp)
    db.add(camp)

    # Add default resources
    stock = ResourceStock(
        camp_id=camp.camp_id,
        food=float(camp.capacity * 3),
        water=float(camp.capacity * 15),
        medicine=float(camp.capacity * 0.1),
        beds=float(camp.capacity),
        fuel=100.0
    )
    db.add(stock)
    db.commit()
    db.refresh(camp)
    return camp

@router.patch("/camps/{camp_id}")
async def patch_camp(
    camp_id: str,
    patch_data: CampPatch,
    current_user: User = Depends(require_authority),
    db: Session = Depends(get_db)
):
    try:
        updated = await state_manager.update_camp(
            db=db,
            camp_id=camp_id,
            actor="authority",
            capacity=patch_data.capacity,
            current_occupancy=patch_data.current_occupancy,
            occupancy_delta=patch_data.occupancy_delta,
            status=patch_data.status,
            facilities=patch_data.facilities.dict() if patch_data.facilities else None,
            contact_name=patch_data.contact_name or patch_data.contact,
            contact_phone=patch_data.contact_phone,
            notes=patch_data.notes
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/camps/{camp_id}")
def delete_camp(camp_id: str, db: Session = Depends(get_db)):
    camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")
    db.delete(camp)
    db.commit()
    return {"status": "deleted", "camp_id": camp_id}

@router.get("/resources")
def get_resources(db: Session = Depends(get_db)):
    camps = db.query(Camp).all()
    out = []
    for c in camps:
        st = db.query(ResourceStock).filter(ResourceStock.camp_id == c.camp_id).first()
        stock_dict = {
            "food": st.food if st else 1500.0,
            "water": st.water if st else 6000.0,
            "medicine": st.medicine if st else 50.0,
            "beds": st.beds if st else 500.0,
            "fuel": st.fuel if st else 200.0
        }
        cover = calculate_hours_of_cover(stock_dict, c.current_occupancy)
        out.append({
            "camp_id": c.camp_id,
            "camp_name": c.name,
            "occupancy": c.current_occupancy,
            "stock": stock_dict,
            "hours_of_cover": cover["hours_of_cover"],
            "shortages": cover["shortages"],
            "last_updated": st.last_updated.isoformat() if st and st.last_updated else datetime.now(timezone.utc).isoformat()
        })
    return out

@router.patch("/resources/{camp_id}")
def patch_resources(camp_id: str, req: ResourceUpdate, db: Session = Depends(get_db)):
    st = db.query(ResourceStock).filter(ResourceStock.camp_id == camp_id).first()
    if not st:
        st = ResourceStock(camp_id=camp_id)
        db.add(st)
    if req.food is not None: st.food = req.food
    if req.water is not None: st.water = req.water
    if req.medicine is not None: st.medicine = req.medicine
    if req.beds is not None: st.beds = req.beds
    if req.fuel is not None: st.fuel = req.fuel
    st.last_updated = datetime.now(timezone.utc)
    db.commit()
    return st

@router.post("/supply-requests")
def create_supply_request(req: SupplyRequestCreate, db: Session = Depends(get_db)):
    sr = SupplyRequest(
        camp_id=req.camp_id,
        item=req.item,
        quantity=req.quantity,
        status="pending",
        created_by="authority"
    )
    db.add(sr)
    db.commit()
    return sr

@router.get("/rescue-units")
def get_rescue_units(db: Session = Depends(get_db)):
    return db.query(RescueResource).all()

@router.patch("/rescue-units/{unit_id}")
def patch_rescue_unit(unit_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    u = db.query(RescueResource).filter(RescueResource.resource_id == unit_id).first()
    if not u: raise HTTPException(status_code=404, detail="Unit not found")
    if "status" in payload: u.status = payload["status"]
    if "assigned_zone" in payload: u.assigned_zone = payload["assigned_zone"]
    if "lat" in payload: u.lat = payload["lat"]
    if "lng" in payload: u.lng = payload["lng"]
    db.commit()
    return u

@router.post("/rescue/dispatch")
async def manual_rescue_dispatch(req: RescueDispatch, db: Session = Depends(get_db)):
    u = db.query(RescueResource).filter(RescueResource.resource_id == req.unit_id).first()
    z = db.query(Zone).filter(Zone.zone_id == req.zone_id).first()
    if not u or not z:
        raise HTTPException(status_code=404, detail="Unit or Zone not found")

    u.status = "in_transit"
    u.assigned_zone = z.zone_id
    u.eta = "15 mins"

    evt = AgentEvent(
        agent_name="Rescue Dispatch Authority",
        action="MANUAL_DISPATCH",
        input_summary=f"Unit {u.name} dispatched to Zone {z.name}",
        status="success",
        related_zone=z.zone_id,
        related_resource=u.resource_id
    )
    db.add(evt)
    db.commit()

    await bus.publish("unit_updated", {
        "unit_id": u.resource_id,
        "name": u.name,
        "status": u.status,
        "assigned_zone": z.name
    })
    return {"status": "dispatched", "unit_id": u.resource_id, "zone": z.name}

@router.get("/rescue/directives")
def get_authority_rescue_directives(db: Session = Depends(get_db)):
    return db.query(RescueDirective).order_by(RescueDirective.created_at.desc()).all()

@router.post("/rescue/directives")
async def create_authority_rescue_directive(payload: Dict[str, Any], db: Session = Depends(get_db)):
    directive = RescueDirective(
        target_zone=payload.get("target_zone", "ZONE-2"),
        location_name=payload.get("location_name", "Submerged Area"),
        lat=payload.get("lat", 25.20),
        lng=payload.get("lng", 76.50),
        people_count=payload.get("people_count", 25),
        urgency=payload.get("urgency", "Critical"),
        how_to_rescue=payload.get("how_to_rescue", ""),
        assigned_camp_id=payload.get("assigned_camp_id", "camp_01"),
        assigned_camp_name=payload.get("assigned_camp_name", "Relief Camp"),
        equipment_needed=payload.get("equipment_needed", []),
        vulnerabilities=payload.get("vulnerabilities", {}),
        status="assigned"
    )
    db.add(directive)
    db.commit()
    db.refresh(directive)

    await bus.publish("directive_created", {
        "id": directive.id,
        "camp_id": directive.assigned_camp_id,
        "urgency": directive.urgency,
        "people": directive.people_count
    })
    return directive

@router.get("/ai/camp-candidates")
def get_ai_camp_candidates(area: str = Query("", description="Chennai locality name"), db: Session = Depends(get_db)):
    """AI gathers potential relief facilities (schools, college auditoriums, indoor stadiums) in Chennai"""
    candidates = state_manager.get_ai_camp_candidates(area)
    return candidates

@router.post("/ai/generate-announcement")
def generate_ai_announcement(
    payload: Optional[Dict[str, Any]] = None,
    zone_id: Optional[str] = Query(None),
    severity: str = Query("auto"),
    db: Session = Depends(get_db)
):
    """AI automatically generates draft advisory based on current rainfall cm & flood inundation cm"""
    if payload and "zone_id" in payload and payload["zone_id"]:
        zone_id = payload["zone_id"]
    if zone_id:
        target_z = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    else:
        # Find zone with highest risk
        target_z = db.query(Zone).order_by(Zone.current_probability.desc()).first()

    if not target_z:
        target_z_name = "Greater Chennai District"
        rain_cm = 20.0
        flood_cm = 50.0
        roads = ["Velachery Main Road", "Mudichur High Road"]
        safe_route = "GST Road Elevated Corridor"
    else:
        target_z_name = target_z.name
        rain_cm = target_z.predicted_rain_cm or 22.0
        flood_cm = target_z.predicted_flood_depth_cm or 55.0
        roads = target_z.flooded_roads or ["Main arterial roads"]
        safe_route = (target_z.safe_corridors[0] if target_z.safe_corridors else "Elevated Flyovers")

    level = "Evacuate" if flood_cm >= 50.0 or rain_cm >= 20.0 else "Warning"
    
    title = f"AI Flash Advisory: Severe Waterlogging ({flood_cm}cm) in {target_z_name}"
    body = (
        f"Doppler radar records {rain_cm}cm rain accumulation. Inundation depth projected at {flood_cm}cm. "
        f"Inaccessible routes: {', '.join(roads[:3])}. "
        f"Designated evacuation corridor: {safe_route}. Relief boats & SDRF tactical teams are stationed. "
        f"Proceed to nearest relief center immediately or contact 1913."
    )

    draft_ann = Announcement(
        id=f"ann_ai_{uuid.uuid4().hex[:6]}",
        title=title,
        body=body,
        level=level,
        language="en",
        target_zone=target_z_name,
        predicted_rain_cm=rain_cm,
        predicted_flood_cm=flood_cm,
        ai_suggested=True,
        confirmed_by_authority=False, # Needs authority confirmation
        published_by="AI Emergency Operations System"
    )
    db.add(draft_ann)
    db.commit()
    db.refresh(draft_ann)

    return {
        "id": draft_ann.id,
        "title": draft_ann.title,
        "body": draft_ann.body,
        "level": draft_ann.level,
        "target_zone": draft_ann.target_zone,
        "predicted_rain_cm": draft_ann.predicted_rain_cm,
        "predicted_flood_cm": draft_ann.predicted_flood_cm,
        "ai_suggested": True,
        "confirmed_by_authority": False,
        "ai_rationale": f"Triggered by {target_z_name} exceeding hydrological alert thresholds with {rain_cm}cm rainfall."
    }

@router.post("/announcements/{ann_id}/confirm")
async def confirm_ai_announcement(ann_id: str, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    ann.confirmed_by_authority = True
    ann.published_by = "Greater Chennai Corporation (GCC) Disaster Mgmt"
    ann.published_at = datetime.now(timezone.utc)
    db.commit()

    # Broadcast to public
    await bus.publish("announcement_published", {
        "id": ann.id,
        "title": ann.title,
        "body": ann.body,
        "level": ann.level,
        "target_zone": ann.target_zone,
        "predicted_rain_cm": ann.predicted_rain_cm,
        "predicted_flood_cm": ann.predicted_flood_cm
    }, is_public_safe=True)

    return {"status": "confirmed_and_broadcast", "id": ann.id, "title": ann.title}

@router.get("/groups")
def get_evacuation_groups(db: Session = Depends(get_db)):
    return db.query(EvacuationGroup).all()

@router.post("/groups")
async def create_evacuation_group(req: GroupCreate, db: Session = Depends(get_db)):
    dest = req.destination_camp
    if not dest:
        camps = db.query(Camp).filter(Camp.status != "closed").all()
        sorted_camps = sorted(camps, key=lambda c: (c.capacity - (c.current_occupancy + c.inbound_occupancy)), reverse=True)
        dest = sorted_camps[0].camp_id if sorted_camps else "camp_guru_nanak"

    grp = EvacuationGroup(
        name=req.name or f"NDRF Team ({req.group_type.title()})",
        source_zone=req.source_zone,
        group_type=req.group_type,
        boats_count=req.boats_count,
        personnel_count=req.personnel_count,
        air_drop_kits=req.air_drop_kits,
        vehicles_count=req.vehicles_count,
        population=req.population,
        destination_camp=dest,
        status="waiting",
        eta="18 mins"
    )
    db.add(grp)
    db.commit()
    db.refresh(grp)
    return grp

@router.patch("/groups/{group_id}/status")
async def patch_group_status(group_id: str, req: GroupStatusPatch, db: Session = Depends(get_db)):
    try:
        updated = await state_manager.update_group_status(
            db=db,
            group_id=group_id,
            new_status=req.status,
            actor="authority"
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/groups/{group_id}/assign")
@router.patch("/groups/{group_id}/assign")
async def assign_group_camp(group_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    grp = db.query(EvacuationGroup).filter(
        (EvacuationGroup.group_id == group_id) | (EvacuationGroup.name == group_id)
    ).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found")
    camp_id = payload.get("camp_id")
    if camp_id:
        grp.destination_camp = camp_id
        grp.assigned_camp_id = camp_id
        grp.status = "moving"
        db.commit()
        db.refresh(grp)
    return grp

@router.post("/coordinator/tick")
async def force_coordinator_tick(db: Session = Depends(get_db)):
    await coordinator.run_cycle(db, trigger_reason="manual_forced_tick")
    await briefing_service.refresh_briefs(db)
    return {
        "status": "cycle_executed",
        "cycle_id": coordinator.current_cycle_id,
        "stage": coordinator.current_stage
    }

@router.post("/camps/transfer")
async def transfer_camp_occupancy(req: CampTransferRequest, db: Session = Depends(get_db)):
    try:
        res = await state_manager.transfer_camp_occupancy(
            db=db,
            from_camp_id=req.from_camp,
            to_camp_id=req.to_camp,
            people=req.people,
            actor="authority"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/approvals")
def get_approvals(db: Session = Depends(get_db)):
    return db.query(Approval).order_by(Approval.created_at.desc()).all()

@router.post("/approvals/{approval_id}/decision")
async def decide_approval(approval_id: str, req: ApprovalDecision, db: Session = Depends(get_db)):
    app = db.query(Approval).filter(Approval.id == approval_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Approval not found")

    app.status = req.decision
    app.decided_by = "District Collector"
    app.decision_note = req.note or ""
    app.override = req.override
    app.decided_at = datetime.now(timezone.utc)

    # If approved, apply corresponding state action
    if req.decision == "approve":
        if app.type in ["camp_redirect", "transfer"] and "from_camp_id" in app.payload:
            people = app.payload.get("people", 100)
            from_id = app.payload.get("from_camp_id")
            to_id = app.payload.get("to_camp_id")
            if from_id and to_id:
                try:
                    await state_manager.transfer_camp_occupancy(db, from_id, to_id, people, actor="approval_exec")
                except Exception as ex:
                    print(f"Transfer on approval failed: {ex}")

    evt = AgentEvent(
        agent_name="Approval Authority",
        action=f"APPROVAL_{req.decision.upper()}",
        input_summary=f"Approval ID: {approval_id}, Type: {app.type}",
        output_summary=f"Decision: {req.decision}, Note: {req.note}",
        status="success"
    )
    db.add(evt)
    db.commit()

    await bus.publish("approval_created", {"id": app.id, "status": app.status})
    return app

@router.post("/announcements/draft", response_model=AnnouncementDraftResponse)
def draft_announcement(req: AnnouncementDraftRequest, db: Session = Depends(get_db)):
    title = f"District Advisory: {req.topic.capitalize()}"
    body = f"The District Disaster Management Authority (DDMA) Alappuzha has issued an advisory regarding {req.topic}. Residents in Kuttanad and along the Pamba river basin are advised to remain vigilant. Designated relief centers are fully operational."
    return AnnouncementDraftResponse(title=title, body=body)

@router.post("/announcements")
async def publish_announcement(req: AnnouncementCreate, db: Session = Depends(get_db)):
    ann = Announcement(
        title=req.title,
        body=req.body,
        level=req.level,
        language=req.language,
        published_by="District Collector, Alappuzha",
        published_at=datetime.now(timezone.utc)
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    pub_payload = {
        "id": ann.id,
        "title": ann.title,
        "body": ann.body,
        "level": ann.level,
        "language": ann.language,
        "published_at": ann.published_at.isoformat(),
        "published_by": ann.published_by
    }
    await bus.publish("announcement_published", pub_payload, is_public_safe=True)
    return ann

@router.delete("/announcements/{ann_id}")
def retract_announcement(ann_id: str, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann: raise HTTPException(status_code=404, detail="Announcement not found")
    ann.retracted = True
    db.commit()
    return {"status": "retracted", "id": ann_id}

@router.post("/observations")
async def create_observation(req: ObservationCreate, db: Session = Depends(get_db)):
    obs = Observation(
        source="manual",
        type=req.type,
        zone_id=req.zone_id,
        value=req.value,
        note=req.note or "",
        fetched_at=datetime.now(timezone.utc)
    )
    db.add(obs)
    db.commit()

    if req.type == "river":
        await bus.publish("alert", {"title": f"Manual river level reading: {req.value}m", "level": "High"})

    # Trigger cycle
    await coordinator.run_cycle(db, trigger_reason=f"manual_observation_{req.type}")
    return obs

@router.get("/predictions")
def get_predictions(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    out = []
    for z in zones:
        out.append({
            "zone_id": z.zone_id,
            "name": z.name,
            "category": z.current_risk_category,
            "probability": z.current_probability,
            "p_3h": round(min(0.99, z.current_probability + 0.05), 2),
            "p_6h": round(min(0.99, z.current_probability + 0.10), 2),
            "p_12h": round(min(0.99, z.current_probability + 0.14), 2),
            "expected_affected": int(z.population * z.current_probability * 0.7),
            "confidence": 0.88,
            "flooded_pct": z.flooded_pct
        })
    return out

@router.get("/predictions/{zone_id}/explain")
def explain_prediction(zone_id: str, db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if not z: raise HTTPException(status_code=404, detail="Zone not found")
    features = {
        "rain_3h_mm": 42.0,
        "river_level_m": 5.25,
        "river_rise_rate_m_hr": 0.18,
        "low_lying_index": z.low_lying_index,
        "river_proximity_km": z.river_proximity,
        "satellite_water_fraction": z.satellite_water_fraction,
        "elevation_m": z.elevation
    }
    pred = predict_risk(features, population=z.population)
    return {"features": pred["contributions"]}

@router.get("/agents")
def get_agent_health():
    agents = coordinator.get_all_agents()
    return [
        {
            "name": a.name,
            "status": a.status,
            "last_run": a.last_run.isoformat(),
            "runs": a.runs,
            "last_message": a.last_message
        }
        for a in agents
    ]

@router.get("/events")
def get_events(limit: int = Query(50), db: Session = Depends(get_db)):
    events = db.query(AgentEvent).order_by(AgentEvent.timestamp.desc()).limit(limit).all()
    return events

@router.post("/coordinator/tick")
async def force_coordinator_tick(db: Session = Depends(get_db)):
    res = await coordinator.run_cycle(db, trigger_reason="manual_force_tick")
    await briefing_service.refresh_briefs(db)
    return res

@router.post("/sim/run")
def run_simulation(req: SimRunRequest, db: Session = Depends(get_db)):
    res = simulation_service.run_benchmark(seeds=req.seeds)
    sr = SimResult(metrics=res)
    db.add(sr)
    db.commit()
    return res

@router.get("/sim/results")
def get_sim_results(db: Session = Depends(get_db)):
    latest = db.query(SimResult).order_by(SimResult.run_at.desc()).first()
    if latest:
        return latest.metrics
    return simulation_service.run_benchmark(seeds=30)

@router.post("/demo/inject-surge")
async def inject_demo_surge(payload: Dict[str, str], db: Session = Depends(get_db)):
    zone_id = payload.get("zone_id", "zone_d")
    z = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if z:
        z.satellite_water_fraction = min(0.95, z.satellite_water_fraction + 0.40)
        z.low_lying_index = min(1.0, z.low_lying_index + 0.2)
        db.commit()

    # Trigger cycle
    await coordinator.run_cycle(db, trigger_reason=f"satellite_surge_injection_{zone_id}")
    await briefing_service.refresh_briefs(db)

    await bus.publish("zone_risk_changed", {
        "zone_id": zone_id,
        "name": z.name if z else zone_id,
        "risk_category": "Critical",
        "probability": 0.88
    })
    return {"status": "surge_injected", "zone": z.name if z else zone_id}

@router.post("/demo/reset")
async def reset_demo_data(db: Session = Depends(get_db)):
    # Reset camps to seed defaults
    camps = db.query(Camp).all()
    base_occ = {"camp_01": 500, "camp_02": 400, "camp_03": 700, "camp_04": 300, "camp_05": 200}
    for c in camps:
        c.current_occupancy = base_occ.get(c.camp_id, 300)
        c.inbound_occupancy = 0
        state_manager.update_camp_status_derived(c)

    zones = db.query(Zone).all()
    for z in zones:
        z.satellite_water_fraction = 0.15
        z.current_probability = 0.42
        z.current_risk_category = "Medium"

    db.commit()
    await coordinator.run_cycle(db, trigger_reason="demo_reset")
    await briefing_service.refresh_briefs(db)
    return {"status": "reset_completed"}

@router.get("/camps/live", response_model=LiveBoardData)
def get_camps_live_board(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    groups = db.query(EvacuationGroup).all()
    camps = db.query(Camp).all()
    movements = db.query(CampMovement).order_by(CampMovement.arrival_time.desc()).limit(15).all()

    z_out = [LiveBoardZone(zone_id=z.zone_id, name=z.name, needing_evac=z.needing_evacuation) for z in zones]
    g_out = [LiveBoardGroup(
        group_id=g.group_id,
        source_zone=g.source_zone,
        size=g.population,
        status=g.status,
        destination_camp=g.destination_camp,
        eta=g.eta
    ) for g in groups]

    c_out = []
    warnings = []
    for c in camps:
        st = db.query(ResourceStock).filter(ResourceStock.camp_id == c.camp_id).first()
        stock_dict = {
            "food": st.food if st else 1500.0,
            "water": st.water if st else 6000.0,
            "medicine": st.medicine if st else 50.0,
            "beds": st.beds if st else 500.0,
            "fuel": st.fuel if st else 200.0
        }
        cover = calculate_hours_of_cover(stock_dict, c.current_occupancy)
        projected = c.current_occupancy + c.inbound_occupancy
        proj_pct = round((projected / c.capacity) * 100.0, 1) if c.capacity > 0 else 100.0

        if proj_pct >= 90.0:
            warnings.append(f"{c.name} projected at {projected}/{c.capacity} ({proj_pct}%). Capacity action recommended.")

        c_out.append(LiveBoardCamp(
            camp_id=c.camp_id,
            name=c.name,
            capacity=c.capacity,
            occupancy=c.current_occupancy,
            inbound=c.inbound_occupancy,
            free=max(0, c.capacity - projected),
            status=c.status,
            projected_pct=proj_pct,
            hours_of_cover=cover["min_hours_of_cover"]
        ))

    m_out = [
        LiveBoardArrival(
            time=m.arrival_time.strftime("%H:%M") if m.arrival_time else "10:30",
            size=m.people_count,
            source_zone=m.source_zone or "Zone A",
            transport=m.transport_type or "Boat",
            camp=m.camp_id,
            status=m.status
        )
        for m in movements
    ]

    return LiveBoardData(
        zones=z_out,
        groups=g_out,
        camps=c_out,
        arrivals=m_out,
        warnings=warnings
    )

@router.post("/demo/simulate-arrival")
async def simulate_arrival(req: SimulateArrivalRequest, db: Session = Depends(get_db)):
    camp = db.query(Camp).filter(Camp.camp_id == req.camp_id).first()
    if not camp: raise HTTPException(status_code=404, detail="Camp not found")

    updated = await state_manager.update_camp(
        db=db,
        camp_id=req.camp_id,
        actor="demo_simulate_arrival",
        occupancy_delta=req.people
    )

    # Add arrival movement record
    mov = CampMovement(
        camp_id=req.camp_id,
        people_count=req.people,
        status="arrived",
        source_zone="Zone A (Simulated Arrival)",
        transport_type="Rescue Boat"
    )
    db.add(mov)
    db.commit()

    return {"status": "arrived", "camp": camp.name, "occupancy_now": camp.current_occupancy}

@router.get("/loop", response_model=LoopStageResponse)
def get_loop_stage(db: Session = Depends(get_db)):
    recent_evts = db.query(AgentEvent).order_by(AgentEvent.timestamp.desc()).limit(5).all()
    return LoopStageResponse(
        stage=coordinator.current_stage,
        message=coordinator.current_stage_message,
        cycle_id=coordinator.current_cycle_id,
        timestamp=coordinator.last_cycle_time.isoformat(),
        recent_events=[
            {"agent": e.agent_name, "action": e.action, "summary": e.output_summary, "time": e.timestamp.strftime("%H:%M:%S")}
            for e in recent_evts
        ]
    )

@router.post("/assistant", response_model=AssistantResponse)
async def post_authority_assistant(req: AssistantRequest, db: Session = Depends(get_db)):
    resp = await assistant_service.answer_authority_question(db, req.question, req.lang)
    return AssistantResponse(**resp)
