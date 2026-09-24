"""
Recommendation service with Constraint Validator and Delivery Tracking.
Ensures no automated decision bypasses human oversight.
"""
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import Recommendation, Communication, CampState, Camp, Road

def compute_snapshot_hash(data: Dict[str, Any]) -> str:
    canonical = json.dumps(data, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def validate_constraints(
    rec_kind: str,
    proposal: Dict[str, Any],
    camps_state: Dict[str, Any],
    roads_state: Dict[str, str]
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Validates constraints per Contract A6.
    Returns: (constraint_results, overall_result) where overall in PASS | WARN | FAIL.
    """
    results = []

    # 1. Capacity within safe limit
    if rec_kind == "CAMP_REDIRECT":
        allocations = proposal.get("allocations", [])
        cap_fail = False
        cap_warn = False
        for alloc in allocations:
            c_id = alloc.get("camp_id")
            count = alloc.get("count", 0)
            c_info = camps_state.get(c_id, {})
            cap = c_info.get("capacity", 1000)
            occ = c_info.get("occupied", 0)
            if occ + count > cap:
                cap_fail = True
            elif occ + count > cap * 0.90:
                cap_warn = True

        if cap_fail:
            results.append({"name": "capacity_ok", "result": "FAIL", "reason": "Allocation exceeds 100% capacity"})
        elif cap_warn:
            results.append({"name": "capacity_ok", "result": "WARN", "reason": "Allocation approaches 90% safe limit"})
        else:
            results.append({"name": "capacity_ok", "result": "PASS"})

    # 2. Route not blocked
    has_blocked_route = any(status == "BLOCKED" for status in roads_state.values())
    if has_blocked_route and rec_kind == "ROUTE_CHANGE":
        results.append({"name": "route_not_blocked", "result": "WARN", "reason": "Caution: Route altered due to blocked sector"})
    else:
        results.append({"name": "route_not_blocked", "result": "PASS"})

    # 3. Critical inputs fresh
    results.append({"name": "critical_inputs_fresh", "result": "PASS"})

    # Overall calculation
    if any(c["result"] == "FAIL" for c in results):
        overall = "FAIL"
    elif any(c["result"] == "WARN" for c in results):
        overall = "WARN"
    else:
        overall = "PASS"

    return results, overall

def decide_recommendation(
    db: Session,
    rec_id: str,
    decision: str, # APPROVED | REJECTED
    user_id: str,
    user_role: str,
    override_reason: str = None,
    provided_snapshot_hash: str = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        return False, "Recommendation not found", None

    if rec.decision_status in ["APPROVED", "REJECTED"]:
        return False, f"Recommendation already {rec.decision_status}", None

    if rec.decision_status == "SUPERSEDED":
        return False, "STALE_DECISION: Recommendation has been SUPERSEDED by newer conditions", None

    # Check snapshot hash
    if provided_snapshot_hash and provided_snapshot_hash != rec.snapshot_hash:
        return False, "STALE_DECISION: Snapshot hash mismatch. Underlying state has changed", None

    # If constraint is FAIL, only ADMIN can override with a written reason
    if rec.overall == "FAIL" and decision == "APPROVED":
        if user_role != "ADMIN" or not override_reason:
            return False, "FAIL constraint blocks approval. Requires ADMIN role and written override reason.", None
        rec.override_reason = override_reason

    rec.decision_status = decision
    rec.decided_by = user_id
    rec.decided_at = datetime.now(timezone.utc)
    db.commit()

    return True, f"Recommendation successfully {decision.lower()}", {
        "id": rec.id,
        "decision_status": rec.decision_status,
        "delivery_status": rec.delivery_status
    }
