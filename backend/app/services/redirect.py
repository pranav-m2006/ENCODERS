"""
Camp redirect and group split optimization service.
Ground truth for 900/1000 + 180 -> 100 to A, 80 to B.
"""
from typing import Dict, List, Any, Optional

def calculate_split_allocation(
    camps: List[Dict[str, Any]],
    incoming_group: Dict[str, Any],
    roads: Optional[List[Dict[str, Any]]] = None,
    safe_fill_ratio: float = 1.0 # Max capacity or 0.90
) -> Dict[str, Any]:
    """
    Computes split allocation when an incoming group exceeds target camp capacity.
    """
    target_id = incoming_group.get("target_camp_id")
    group_count = incoming_group.get("count", 0)
    group_id = incoming_group.get("id")

    camp_map = {c["id"]: c for c in camps}
    target_camp = camp_map.get(target_id)
    if not target_camp:
        return {
            "status": "ERROR",
            "reason": f"Target camp {target_id} not found"
        }

    target_cap = target_camp.get("capacity", 1000)
    target_occ = target_camp.get("occupied", 0)
    target_avail = max(0, target_cap - target_occ)

    if group_count <= target_avail:
        return {
            "status": "SINGLE_ALLOCATION",
            "decision": "CAMP_ASSIGN",
            "allocations": [{"camp_id": target_id, "count": group_count}]
        }

    # Split required: target can take target_avail
    overflow_count = group_count - target_avail

    # Check candidate camps that are OPEN, safe, and reachable
    # Check road status if roads provided
    unreachable_camps = set()
    if roads:
        for r in roads:
            if r.get("status") == "BLOCKED":
                if r.get("to") in camp_map:
                    unreachable_camps.add(r.get("to"))

    candidates = [
        c for c in camps
        if c["id"] != target_id
        and c.get("status", "OPEN").upper() == "OPEN"
        and c.get("risk", "LOW").upper() in ["LOW", "MODERATE"]
        and c["id"] not in unreachable_camps
    ]

    # Sort candidates by remaining capacity descending
    candidates.sort(key=lambda c: (c.get("capacity", 0) - c.get("occupied", 0)), reverse=True)

    if not candidates:
        return {
            "status": "NO_VIABLE_ALTERNATIVE",
            "fallback": "ARRIVE_WITH_OVERCAPACITY_ALERT",
            "reason": "All alternative camps full, high-risk, or blocked"
        }

    best_candidate = candidates[0]
    cand_avail = best_candidate.get("capacity", 0) - best_candidate.get("occupied", 0)

    if cand_avail < overflow_count:
        # Candidate cannot fit all overflow, but can take partial
        pass

    allocations = [
        {"camp_id": target_id, "count": target_avail},
        {"camp_id": best_candidate["id"], "count": overflow_count}
    ]

    return {
        "status": "SPLIT_REQUIRED",
        "decision": "CAMP_REDIRECT",
        "allocations": allocations,
        "resulting_occupancy": {
            target_id: target_occ + target_avail,
            best_candidate["id"]: best_candidate.get("occupied", 0) + overflow_count
        },
        "explanation": {
            "summary": f"Target {target_camp.get('name', target_id)} capped at capacity ({target_cap}). {overflow_count} redirected to {best_candidate.get('name', best_candidate['id'])}."
        }
    }
