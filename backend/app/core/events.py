"""
Pure event apply functions for FloodOps.
No I/O. Deterministic state derivation from events.
Shared logic ported 1:1 between Python backend and browser TypeScript layer.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from app.core.hlc import check_clock_skew

def compute_fill_band(occupied: int, capacity: int) -> str:
    """Contract A4: GREEN < 70%, AMBER 70-90%, RED >= 90%"""
    if capacity <= 0:
        return "RED"
    ratio = occupied / capacity
    if ratio < 0.70:
        return "GREEN"
    elif ratio < 0.90:
        return "AMBER"
    return "RED"

def apply_event_to_camp_state(
    current_state: Dict[str, Any],
    event: Dict[str, Any],
    applied_event_ids: set,
    revoked_device_ids: Optional[set] = None,
    revoked_user_ids: Optional[set] = None,
    server_received_at: Optional[datetime] = None
) -> Tuple[Dict[str, Any], str, Optional[str], Optional[str]]:
    """
    Applies a single event to a camp projection state.
    Returns: (new_state, result, conflict_type, reason)
    result in: APPLIED | DUPLICATE | CONFLICT | REJECTED
    """
    event_id = event.get("event_id")
    event_type = event.get("type")
    payload = event.get("payload", {})
    device_id = event.get("device_id")
    user_id = event.get("user_id")

    # 1. Idempotency
    if event_id in applied_event_ids:
        return current_state, "DUPLICATE", None, "Event already applied"

    # 2. Unauthorized origin check
    if revoked_device_ids and device_id in revoked_device_ids:
        return current_state, "CONFLICT", "UNAUTHORIZED_ORIGIN", f"Device {device_id} is revoked"
    if revoked_user_ids and user_id in revoked_user_ids:
        return current_state, "CONFLICT", "UNAUTHORIZED_ORIGIN", f"User {user_id} is revoked"

    # 3. Check Clock Skew (Contract: flag but apply)
    recorded_at_str = event.get("recorded_at")
    skew_flag = None
    if recorded_at_str and server_received_at:
        try:
            rec_dt = datetime.fromisoformat(recorded_at_str.replace("Z", "+00:00"))
            if check_clock_skew(rec_dt, server_received_at, max_skew_seconds=600):
                skew_flag = "CLOCK_SKEW"
        except Exception:
            pass

    new_state = dict(current_state)
    capacity = new_state.get("capacity", 1000)
    occupied = new_state.get("occupied", 0)
    alerts = list(new_state.get("alerts", []))

    if event_type == "CAMP_ARRIVAL":
        count = payload.get("count", 0)
        new_occupied = occupied + count
        new_state["occupied"] = new_occupied
        new_state["available"] = max(0, capacity - (new_occupied + new_state.get("reserved", 0)))
        new_state["fill_band"] = compute_fill_band(new_occupied, capacity)
        if new_occupied > capacity:
            alerts.append({
                "type": "OVERCAPACITY",
                "message": f"Camp occupancy {new_occupied} exceeds capacity {capacity} by {new_occupied - capacity}",
                "event_id": event_id
            })
        new_state["alerts"] = alerts
        return new_state, "APPLIED", skew_flag, None

    elif event_type == "CAMP_DEPARTURE":
        count = payload.get("count", 0)
        new_occupied = occupied - count
        if new_occupied < 0:
            return current_state, "CONFLICT", "NEGATIVE_OCCUPANCY", f"Departure of {count} exceeds occupancy {occupied}"
        new_state["occupied"] = new_occupied
        new_state["available"] = max(0, capacity - (new_occupied + new_state.get("reserved", 0)))
        new_state["fill_band"] = compute_fill_band(new_occupied, capacity)
        new_state["alerts"] = alerts
        return new_state, "APPLIED", skew_flag, None

    elif event_type == "GROUP_ASSIGNED":
        count = payload.get("count", 0)
        reserved = new_state.get("reserved", 0) + count
        new_state["reserved"] = reserved
        new_state["projected"] = occupied + reserved
        new_state["available"] = max(0, capacity - new_state["projected"])
        new_state["fill_band"] = compute_fill_band(occupied, capacity)
        return new_state, "APPLIED", skew_flag, None

    elif event_type == "GROUP_ARRIVED":
        # Group arrived: transitions from reserved to occupied
        count = payload.get("count", 0)
        group_id = payload.get("group_id")
        known_groups = new_state.get("arrived_groups", set())
        if group_id and group_id in known_groups:
            return current_state, "CONFLICT", "DOUBLE_ARRIVAL", f"Group {group_id} already recorded arrived"
        
        reserved = max(0, new_state.get("reserved", 0) - count)
        new_occupied = occupied + count
        new_state["reserved"] = reserved
        new_state["occupied"] = new_occupied
        new_state["projected"] = new_occupied + reserved
        new_state["available"] = max(0, capacity - new_state["projected"])
        new_state["fill_band"] = compute_fill_band(new_occupied, capacity)
        if group_id:
            new_groups = set(known_groups)
            new_groups.add(group_id)
            new_state["arrived_groups"] = new_groups
        return new_state, "APPLIED", skew_flag, None

    elif event_type == "RESOURCE_STOCKTAKE":
        base_version = event.get("base_version")
        current_version = new_state.get("version", 0)
        if base_version is not None and base_version != current_version:
            return current_state, "CONFLICT", "STOCKTAKE_MISMATCH", f"Expected base version {current_version}, got {base_version}"
        new_state["resources"] = dict(payload.get("resources", {}))
        new_state["version"] = current_version + 1
        return new_state, "APPLIED", skew_flag, None

    elif event_type == "RESOURCE_ADJUST":
        resources = dict(new_state.get("resources", {}))
        for item, delta in payload.get("deltas", {}).items():
            resources[item] = max(0, resources.get(item, 0) + delta)
        new_state["resources"] = resources
        return new_state, "APPLIED", skew_flag, None

    # Pass-through for other event types
    return new_state, "APPLIED", skew_flag, None

def replay_events_for_camp(
    initial_camp: Dict[str, Any],
    events: List[Dict[str, Any]],
    revoked_device_ids: Optional[set] = None,
    revoked_user_ids: Optional[set] = None
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Deterministically replays a sequence of events to construct camp projection.
    Returns (final_state, event_results)
    """
    state = {
        "camp_id": initial_camp.get("camp_id") or initial_camp.get("id"),
        "capacity": initial_camp.get("capacity", 1000),
        "occupied": initial_camp.get("initial_occupied", 0) or initial_camp.get("occupied", 0),
        "reserved": initial_camp.get("reserved", 0),
        "projected": (initial_camp.get("initial_occupied", 0) or initial_camp.get("occupied", 0)) + initial_camp.get("reserved", 0),
        "available": initial_camp.get("capacity", 1000) - ((initial_camp.get("initial_occupied", 0) or initial_camp.get("occupied", 0)) + initial_camp.get("reserved", 0)),
        "fill_band": compute_fill_band(initial_camp.get("initial_occupied", 0) or initial_camp.get("occupied", 0), initial_camp.get("capacity", 1000)),
        "resources": dict(initial_camp.get("resources", {})),
        "version": initial_camp.get("version", 0),
        "alerts": [],
        "arrived_groups": set()
    }
    applied_ids = set()
    results = []

    for evt in events:
        state, res, conflict, reason = apply_event_to_camp_state(
            state, evt, applied_ids, revoked_device_ids, revoked_user_ids
        )
        if res == "APPLIED":
            applied_ids.add(evt.get("event_id"))
        results.append({
            "event_id": evt.get("event_id"),
            "result": res,
            "conflict_type": conflict,
            "reason": reason
        })

    return state, results
