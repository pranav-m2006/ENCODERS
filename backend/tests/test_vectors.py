import json
import os
from datetime import datetime, timezone
import pytest
from app.core.events import apply_event_to_camp_state, replay_events_for_camp, compute_fill_band
from app.core.freshness import compute_status, compute_effective_road_status
from app.core.audit import compute_entry_hash, verify_audit_chain, GENESIS_HASH

VECTORS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "vectors"))

def test_occupancy_vectors():
    path = os.path.join(VECTORS_DIR, "occupancy.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for test_case in data["tests"]:
        test_id = test_case["id"]
        initial_camp = {
            "camp_id": "camp_A",
            "capacity": test_case["capacity"],
            "initial_occupied": test_case["initial_occupied"],
            "reserved": 0
        }
        events = test_case["events"]
        state, results = replay_events_for_camp(initial_camp, events)

        if "expected_occupied" in test_case:
            assert state["occupied"] == test_case["expected_occupied"], f"Failed {test_id}: expected occupied {test_case['expected_occupied']}, got {state['occupied']}"
        if "expected_available" in test_case:
            assert state["available"] == test_case["expected_available"], f"Failed {test_id}: expected available {test_case['expected_available']}, got {state['available']}"
        if "expected_fill_band" in test_case:
            assert state["fill_band"] == test_case["expected_fill_band"], f"Failed {test_id}: expected fill band {test_case['expected_fill_band']}, got {state['fill_band']}"
        if "expected_result_second_event" in test_case:
            assert results[1]["result"] == test_case["expected_result_second_event"], f"Failed {test_id} idempotency"
        if "expected_conflict_type" in test_case:
            assert results[0]["conflict_type"] == test_case["expected_conflict_type"], f"Failed {test_id} conflict type"
        if "expected_alert" in test_case:
            assert any(a["type"] == test_case["expected_alert"] for a in state["alerts"]), f"Failed {test_id} alert"

def test_merge_vectors():
    path = os.path.join(VECTORS_DIR, "merge.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    initial = data["initial_state"]
    dev1_events = data["device_1_events"]
    dev2_events = data["device_2_events"]

    # Order 1: Dev 1 then Dev 2
    state1, _ = replay_events_for_camp(initial, dev1_events + dev2_events)
    # Order 2: Dev 2 then Dev 1
    state2, _ = replay_events_for_camp(initial, dev2_events + dev1_events)

    assert state1["occupied"] == data["expected_final_occupied"]
    assert state2["occupied"] == data["expected_final_occupied"]
    assert state1["occupied"] == state2["occupied"]

def test_freshness_vectors():
    path = os.path.join(VECTORS_DIR, "freshness.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    ref_now = datetime.fromisoformat(data["reference_now"].replace("Z", "+00:00"))

    for case in data["tests"]:
        source_type = case["source_type"]
        as_of = case["as_of"]
        if "expected_status" in case:
            status = compute_status(source_type, as_of, now=ref_now)
            assert status == case["expected_status"], f"Failed for {source_type} at {as_of}: got {status}, expected {case['expected_status']}"
        
        if "expected_effective_status" in case:
            eff = compute_effective_road_status(case["raw_status"], as_of, now=ref_now)
            assert eff == case["expected_effective_status"], f"Failed road fail-safe: got {eff}, expected {case['expected_effective_status']}"

def test_audit_chain_and_tamper_detection():
    entries = []
    prev_hash = GENESIS_HASH
    actions = [
        ("LOGIN", "u_1", "system", {"ip": "127.0.0.1"}),
        ("APPROVE_RECOMMENDATION", "u_admin", "rec_9", {"reason": "Capacity optimal"}),
        ("CONFLICT_RESOLUTION", "u_admin", "conf_1", {"resolved_as": "APPLY_COMPENSATION"})
    ]

    for action, actor, target, details in actions:
        ts = "2026-09-24T12:00:00Z"
        h = compute_entry_hash(prev_hash, action, actor, target, ts, details)
        entries.append({
            "prev_hash": prev_hash,
            "action": action,
            "actor_id": actor,
            "target": target,
            "timestamp": ts,
            "details": details,
            "hash": h
        })
        prev_hash = h

    # Valid chain check
    is_valid, broken_idx, msg = verify_audit_chain(entries)
    assert is_valid is True
    assert broken_idx is None

    # Tampered chain check (tamper details of middle entry)
    entries[1]["details"]["reason"] = "Tampered reason"
    is_valid_tampered, broken_idx_tampered, _ = verify_audit_chain(entries)
    assert is_valid_tampered is False
    assert broken_idx_tampered == 1

def test_redirect_vectors():
    from app.services.redirect import calculate_split_allocation
    path = os.path.join(VECTORS_DIR, "redirect.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for case in data["tests"]:
        res = calculate_split_allocation(
            camps=case["camps"],
            incoming_group=case["incoming_group"],
            roads=case.get("roads")
        )
        if "expected_decision" in case:
            assert res["decision"] == case["expected_decision"]
        if "expected_allocations" in case:
            assert res["allocations"] == case["expected_allocations"]
        if "expected_resulting_occupancy" in case:
            for c_id, occ in case["expected_resulting_occupancy"].items():
                assert res["resulting_occupancy"][c_id] == occ
        if "expected_status" in case:
            assert res["status"] == case["expected_status"]

def test_routing_vectors():
    from app.services.routing import find_shortest_route
    path = os.path.join(VECTORS_DIR, "routing.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for case in data["tests"]:
        res = find_shortest_route(
            nodes=case["nodes"],
            edges=case["edges"],
            origin=case["origin"],
            destination=case["destination"]
        )
        if "expected_status" in case:
            assert res["status"] == case["expected_status"]
        if "expected_path" in case:
            assert res["path"] == case["expected_path"]
        if "expected_effective_cost" in case:
            assert res["effective_cost"] == case["expected_effective_cost"]

