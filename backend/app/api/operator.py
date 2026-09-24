from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.models import get_db, Camp, Announcement, RescueDirective, User
from app.services.state import state_manager
from app.core.bus import bus

router = APIRouter(prefix="/operator", tags=["Operator"])

@router.get("/directives")
def get_operator_directives(db: Session = Depends(get_db)):
    return db.query(RescueDirective).order_by(RescueDirective.created_at.desc()).all()

@router.patch("/directives/{dir_id}/status")
async def update_operator_directive_status(dir_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    directive = db.query(RescueDirective).filter(RescueDirective.id == dir_id).first()
    if not directive:
        raise HTTPException(status_code=404, detail="Directive not found")

    if "status" in payload:
        directive.status = payload["status"]
    if "operator_notes" in payload:
        directive.operator_notes = payload["operator_notes"]
    if "arrived_count" in payload:
        directive.arrived_count = payload["arrived_count"]

    directive.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(directive)

    # If marked arrived, auto update camp occupancy
    if payload.get("status") == "arrived" and directive.assigned_camp_id and directive.assigned_camp_id != "all":
        count = payload.get("arrived_count") or directive.people_count
        await state_manager.update_camp(
            db=db,
            camp_id=directive.assigned_camp_id,
            actor="operator_directive_arrival",
            occupancy_delta=count
        )

    return directive

@router.get("/announcements")
def get_operator_announcements(db: Session = Depends(get_db)):
    return db.query(Announcement).filter(Announcement.retracted == False).order_by(Announcement.published_at.desc()).all()

@router.post("/camps/{camp_id}/headcount")
async def submit_camp_headcount(camp_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")

    total_occ = payload.get("total_occupancy", camp.current_occupancy)
    supplies = payload.get("supplies", {})

    camp.current_occupancy = total_occ
    if "meals_remaining" in supplies:
        camp.meals_available = supplies["meals_remaining"]
    if "water_liters_remaining" in supplies:
        camp.water_liters_available = supplies["water_liters_remaining"]
    if "blankets" in supplies:
        camp.blankets_available = supplies["blankets"]
    if "medical_kits" in supplies:
        camp.medical_kits_available = supplies["medical_kits"]
    if "urgent_needs" in payload:
        camp.urgent_needs = payload["urgent_needs"]

    camp.updated_at = datetime.now(timezone.utc)
    camp.updated_by_role = "camp_operator"
    state_manager.update_camp_status_derived(camp)
    db.commit()
    db.refresh(camp)

    await bus.publish("camp_updated", {
        "camp_id": camp.camp_id,
        "name": camp.name,
        "capacity": camp.capacity,
        "current_occupancy": camp.current_occupancy,
        "status": camp.status
    })
    return {"status": "headcount_updated", "camp_id": camp_id, "camp": camp}
