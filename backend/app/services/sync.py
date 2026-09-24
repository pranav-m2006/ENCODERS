"""
Sync engine service for FloodOps.
Handles idempotent push, sequence cursors, pull streaming, conflict queues,
and full projection rebuild from the event stream.
"""
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    SyncEvent, SyncConflict, Camp, CampState, Device, User, AuditLog
)
from app.core.events import apply_event_to_camp_state
from app.core.audit import compute_entry_hash, GENESIS_HASH

def get_latest_audit_hash(db: Session) -> str:
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    return last.hash if last else GENESIS_HASH

def log_audit_entry(db: Session, action: str, actor_id: str, target: str, details: Dict[str, Any]):
    prev = get_latest_audit_hash(db)
    now_iso = datetime.now(timezone.utc).isoformat()
    h = compute_entry_hash(prev, action, actor_id, target, now_iso, details)
    entry = AuditLog(
        prev_hash=prev,
        hash=h,
        action=action,
        actor_id=actor_id,
        target=target,
        timestamp=datetime.now(timezone.utc),
        details=details
    )
    db.add(entry)
    db.commit()

def process_push_events(
    db: Session,
    device_id: str,
    events: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Processes incoming batch of events from a client outbox.
    Returns: (per_event_results, latest_server_cursor)
    """
    results = []
    
    # Check if device is revoked
    dev = db.query(Device).filter(Device.device_id == device_id).first()
    device_revoked = dev.revoked if dev else False

    # Get set of revoked users
    revoked_user_ids = set(u.id for u in db.query(User).filter(User.is_revoked == True).all())

    # Get set of already applied event_ids
    existing_events = {
        e.event_id: e for e in db.query(SyncEvent).filter(
            SyncEvent.event_id.in_([evt["event_id"] for evt in events if "event_id" in evt])
        ).all()
    }

    server_now = datetime.now(timezone.utc)

    for evt in events:
        event_id = evt.get("event_id")
        user_id = evt.get("user_id")
        event_type = evt.get("type")
        entity_id = evt.get("entity_id")
        payload = evt.get("payload", {})
        occurred_at_str = evt.get("occurred_at")
        recorded_at_str = evt.get("recorded_at")
        hlc = evt.get("hlc")
        base_version = evt.get("base_version")

        # 1. Idempotent check
        if event_id in existing_events:
            prev_result = existing_events[event_id].result
            results.append({
                "event_id": event_id,
                "result": "DUPLICATE",
                "reason": f"Event previously processed with result {prev_result}"
            })
            continue

        occurred_at = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00")) if occurred_at_str else server_now
        recorded_at = datetime.fromisoformat(recorded_at_str.replace("Z", "+00:00")) if recorded_at_str else server_now

        # 2. Check revoked credentials
        conflict_type = None
        conflict_reason = None
        if device_revoked:
            conflict_type = "UNAUTHORIZED_ORIGIN"
            conflict_reason = f"Device {device_id} is revoked"
        elif user_id in revoked_user_ids:
            conflict_type = "UNAUTHORIZED_ORIGIN"
            conflict_reason = f"User {user_id} is revoked"

        # 3. Check domain application on projections (e.g. camps)
        res = "APPLIED"
        conflict_id = None

        if not conflict_type and event_type in ["CAMP_ARRIVAL", "CAMP_DEPARTURE", "GROUP_ASSIGNED", "GROUP_ARRIVED", "RESOURCE_STOCKTAKE", "RESOURCE_ADJUST"]:
            # Load projection
            state_row = db.query(CampState).filter(CampState.camp_id == entity_id).first()
            camp_row = db.query(Camp).filter(Camp.camp_id == entity_id).first()
            capacity = camp_row.capacity if camp_row else 1000

            curr_state = {
                "capacity": capacity,
                "occupied": state_row.occupied if state_row else 0,
                "reserved": state_row.reserved if state_row else 0,
                "available": state_row.available if state_row else capacity,
                "resources": state_row.resources if state_row else {},
                "version": state_row.version if state_row else 1,
                "alerts": []
            }

            new_state, apply_result, apply_conflict, apply_reason = apply_event_to_camp_state(
                current_state=curr_state,
                event=evt,
                applied_event_ids=set(),
                server_received_at=server_now
            )

            if apply_result == "CONFLICT":
                res = "CONFLICT"
                conflict_type = apply_conflict
                conflict_reason = apply_reason
            else:
                # Update projection table
                if not state_row:
                    state_row = CampState(camp_id=entity_id)
                    db.add(state_row)
                state_row.occupied = new_state["occupied"]
                state_row.reserved = new_state.get("reserved", 0)
                state_row.projected = new_state["occupied"] + state_row.reserved
                state_row.available = new_state["available"]
                state_row.fill_band = new_state["fill_band"]
                state_row.resources = new_state["resources"]
                state_row.version = new_state.get("version", 1)
                state_row.last_updated_at = server_now

        if conflict_type:
            res = "CONFLICT"
            conflict_row = SyncConflict(
                event_id=event_id,
                conflict_type=conflict_type,
                details={"event": evt, "reason": conflict_reason}
            )
            db.add(conflict_row)
            db.flush()
            conflict_id = conflict_row.id

        # Record to sync_events log
        sync_event = SyncEvent(
            event_id=event_id,
            device_id=device_id,
            user_id=user_id or "anonymous",
            seq=evt.get("seq", 0),
            type=event_type,
            entity_id=entity_id,
            payload=payload,
            occurred_at=occurred_at,
            recorded_at=recorded_at,
            hlc=hlc or f"{server_now.isoformat()}-0000-{device_id}",
            base_version=base_version,
            received_at=server_now,
            result=res,
            conflict_id=conflict_id
        )
        db.add(sync_event)
        db.commit()

        results.append({
            "event_id": event_id,
            "result": res,
            "conflict_id": conflict_id,
            "reason": conflict_reason
        })

    # Return results and current cursor
    last_event = db.query(SyncEvent).order_by(SyncEvent.server_seq.desc()).first()
    cursor = last_event.server_seq if last_event else 0
    return results, cursor

def get_pull_events(
    db: Session,
    since_cursor: int = 0,
    limit: int = 1000
) -> Dict[str, Any]:
    """
    Pulls events applied after `since_cursor` and changed projections.
    """
    events_q = db.query(SyncEvent).filter(SyncEvent.server_seq > since_cursor).order_by(SyncEvent.server_seq.asc()).limit(limit)
    events = events_q.all()

    last_seq = since_cursor
    if events:
        last_seq = events[-1].server_seq

    # Current projections
    camps = db.query(CampState).all()
    camps_projection = {
        c.camp_id: {
            "occupied": c.occupied,
            "reserved": c.reserved,
            "projected": c.projected,
            "available": c.available,
            "fill_band": c.fill_band,
            "resources": c.resources,
            "version": c.version,
            "last_updated_at": c.last_updated_at.isoformat() if c.last_updated_at else None
        }
        for c in camps
    }

    serialized_events = [
        {
            "server_seq": e.server_seq,
            "event_id": e.event_id,
            "device_id": e.device_id,
            "user_id": e.user_id,
            "seq": e.seq,
            "type": e.type,
            "entity_id": e.entity_id,
            "payload": e.payload,
            "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
            "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
            "hlc": e.hlc,
            "result": e.result
        }
        for e in events
    ]

    return {
        "cursor": last_seq,
        "events": serialized_events,
        "projections": {
            "camps": camps_projection
        }
    }

def rebuild_all_projections(db: Session):
    """
    Rebuilds all projection tables from scratch using the immutable sync_events log.
    Proves full database recovery!
    """
    # 1. Reset camp_state to initial capacities
    db.query(CampState).delete()
    db.commit()

    all_camps = db.query(Camp).all()
    for c in all_camps:
        cs = CampState(
            camp_id=c.camp_id,
            occupied=0,
            reserved=0,
            projected=0,
            available=c.capacity,
            fill_band="GREEN",
            version=1
        )
        db.add(cs)
    db.commit()

    # 2. Replay all applied events in server_seq order
    applied_events = db.query(SyncEvent).filter(SyncEvent.result == "APPLIED").order_by(SyncEvent.server_seq.asc()).all()

    for se in applied_events:
        evt_dict = {
            "event_id": se.event_id,
            "type": se.type,
            "entity_id": se.entity_id,
            "payload": se.payload,
            "base_version": se.base_version
        }
        if se.type in ["CAMP_ARRIVAL", "CAMP_DEPARTURE", "GROUP_ASSIGNED", "GROUP_ARRIVED", "RESOURCE_STOCKTAKE", "RESOURCE_ADJUST"]:
            state_row = db.query(CampState).filter(CampState.camp_id == se.entity_id).first()
            camp_row = db.query(Camp).filter(Camp.camp_id == se.entity_id).first()
            capacity = camp_row.capacity if camp_row else 1000

            curr_state = {
                "capacity": capacity,
                "occupied": state_row.occupied if state_row else 0,
                "reserved": state_row.reserved if state_row else 0,
                "available": state_row.available if state_row else capacity,
                "resources": state_row.resources if state_row else {},
                "version": state_row.version if state_row else 1,
                "alerts": []
            }
            new_state, _, _, _ = apply_event_to_camp_state(
                current_state=curr_state,
                event=evt_dict,
                applied_event_ids=set()
            )
            state_row.occupied = new_state["occupied"]
            state_row.reserved = new_state.get("reserved", 0)
            state_row.projected = new_state["occupied"] + state_row.reserved
            state_row.available = new_state["available"]
            state_row.fill_band = new_state["fill_band"]
            state_row.resources = new_state["resources"]
            state_row.version = new_state.get("version", 1)

    db.commit()
