"""
Comprehensive Phase B7 Scenario Tests for FloodOps Backend.
Validates all 14 named requirements from the prompt pack against the live FastAPI app and SQLite engine.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import Base, engine, SessionLocal, Camp, CampState, User, SyncEvent, SyncConflict, Road
from seed.seed import seed_database
from app.services.sync import rebuild_all_projections
from app.agents.base import BaseAgent
from app.core.audit import compute_entry_hash, verify_audit_chain, GENESIS_HASH

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    # Clean up non-seed test events from previous test runs to ensure clean replay state
    db.query(SyncEvent).filter(~SyncEvent.event_id.startswith("seed-")).delete()
    db.commit()
    rebuild_all_projections(db)
    db.close()

def get_auth_token(email="admin@floodops.gov", password="Admin@123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["data"]["access_token"]

# 1. test_700_plus_100_is_800
def test_700_plus_100_is_800():
    token = get_auth_token()
    # Reset Camp A to 700
    db = SessionLocal()
    st = db.query(CampState).filter(CampState.camp_id == "camp_A").first()
    st.occupied = 700
    db.commit()
    db.close()

    res = client.post(
        "/api/v1/camps/camp_A/occupancy",
        json={"delta": 100, "device_id": "TEST-DEV"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["occupied"] == 800

# 2. test_assigned_group_does_not_change_occupied
def test_assigned_group_does_not_change_occupied():
    token = get_auth_token()
    db = SessionLocal()
    st_before = db.query(CampState).filter(CampState.camp_id == "camp_A").first()
    occ_before = st_before.occupied
    db.close()

    # Create and assign group of 60
    c_res = client.post("/api/v1/evacuation-groups", json={"count_likely": 60}, headers={"Authorization": f"Bearer {token}"})
    gid = c_res.json()["data"]["group_id"]

    a_res = client.post(f"/api/v1/evacuation-groups/{gid}/assign", json={"camp_id": "camp_A"}, headers={"Authorization": f"Bearer {token}"})
    assert a_res.status_code == 200

    # Occupied must NOT change. Only reserved changes.
    db = SessionLocal()
    st_after = db.query(CampState).filter(CampState.camp_id == "camp_A").first()
    assert st_after.occupied == occ_before
    assert st_after.reserved >= 60
    db.close()

# 3. test_900_plus_180_splits_100_80
def test_900_plus_180_splits_100_80():
    from app.services.redirect import calculate_split_allocation
    camps = [
        {"id": "camp_A", "name": "Camp A", "capacity": 1000, "occupied": 900, "status": "OPEN", "risk": "LOW"},
        {"id": "camp_B", "name": "Camp B", "capacity": 600, "occupied": 200, "status": "OPEN", "risk": "LOW"}
    ]
    group = {"id": "grp_17", "count": 180, "target_camp_id": "camp_A"}
    res = calculate_split_allocation(camps, group)
    assert res["decision"] == "CAMP_REDIRECT"
    assert res["allocations"] == [{"camp_id": "camp_A", "count": 100}, {"camp_id": "camp_B", "count": 80}]
    assert res["resulting_occupancy"] == {"camp_A": 1000, "camp_B": 280}

# 4. test_offline_devices_100_and_50_merge_to_850_any_order
def test_offline_devices_100_and_50_merge_to_850_any_order():
    from app.core.events import replay_events_for_camp
    initial = {"camp_id": "camp_A", "capacity": 1000, "initial_occupied": 700}
    evt1 = {"event_id": str(uuid.uuid4()), "type": "CAMP_ARRIVAL", "payload": {"count": 100}}
    evt2 = {"event_id": str(uuid.uuid4()), "type": "CAMP_ARRIVAL", "payload": {"count": 50}}

    state_1, _ = replay_events_for_camp(initial, [evt1, evt2])
    state_2, _ = replay_events_for_camp(initial, [evt2, evt1])
    assert state_1["occupied"] == 850
    assert state_2["occupied"] == 850

# 5. test_duplicate_event_is_idempotent
def test_duplicate_event_is_idempotent():
    token = get_auth_token()
    same_id = str(uuid.uuid4())
    evt = {
        "event_id": same_id,
        "device_id": "DEV-1",
        "user_id": "u_test",
        "seq": 1,
        "type": "CAMP_ARRIVAL",
        "entity_id": "camp_B",
        "payload": {"count": 10}
    }
    push1 = client.post("/api/v1/sync/push", json={"device_id": "DEV-1", "events": [evt]})
    assert push1.json()["data"]["results"][0]["result"] == "APPLIED"

    # Push duplicate
    push2 = client.post("/api/v1/sync/push", json={"device_id": "DEV-1", "events": [evt]})
    assert push2.json()["data"]["results"][0]["result"] == "DUPLICATE"

# 6. test_negative_occupancy_creates_conflict
def test_negative_occupancy_creates_conflict():
    evt = {
        "event_id": str(uuid.uuid4()),
        "device_id": "DEV-2",
        "user_id": "u_test",
        "seq": 2,
        "type": "CAMP_DEPARTURE",
        "entity_id": "camp_D", # has 50 occupied initially
        "payload": {"count": 9999} # Exceeds occupancy
    }
    push = client.post("/api/v1/sync/push", json={"device_id": "DEV-2", "events": [evt]})
    res = push.json()["data"]["results"][0]
    assert res["result"] == "CONFLICT"
    assert res["reason"] is not None

# 7. test_overcapacity_arrival_applied_and_alerted
def test_overcapacity_arrival_applied_and_alerted():
    from app.core.events import apply_event_to_camp_state
    camp_state = {"capacity": 1000, "occupied": 950, "alerts": []}
    evt = {"event_id": str(uuid.uuid4()), "type": "CAMP_ARRIVAL", "payload": {"count": 100}}
    new_state, res, _, _ = apply_event_to_camp_state(camp_state, evt, applied_event_ids=set())
    assert res == "APPLIED"
    assert new_state["occupied"] == 1050
    assert new_state["fill_band"] == "RED"
    assert any(a["type"] == "OVERCAPACITY" for a in new_state["alerts"])

# 8. test_rebuild_projections_matches_live_state
def test_rebuild_projections_matches_live_state():
    db = SessionLocal()
    c_before = db.query(CampState).filter(CampState.camp_id == "camp_B").first().occupied
    rebuild_all_projections(db)
    c_after = db.query(CampState).filter(CampState.camp_id == "camp_B").first().occupied
    assert c_after == c_before
    db.close()

# 9. test_failed_agent_output_is_stale_not_live
def test_failed_agent_output_is_stale_not_live():
    import asyncio
    async def _run():
        agent = BaseAgent("mock_weather", failure_threshold=2)
        # First valid run
        async def ok_task():
            return {"temp": 28.0}
        res1 = await agent.execute_with_circuit_breaker(ok_task)
        assert res1["status"] == "LIVE"

        # Failing runs
        async def bad_task():
            raise ConnectionError("Sensor timeout")

        res2 = await agent.execute_with_circuit_breaker(bad_task)
        assert res2["status"] == "STALE"
        assert res2["data"]["_data_status"] == "STALE"
    
    asyncio.run(_run())

# 10. test_blocked_road_excluded_and_reroute_or_no_safe_route
def test_blocked_road_excluded_and_reroute_or_no_safe_route():
    from app.services.routing import find_shortest_route
    nodes = ["N1", "N2", "N3"]
    edges = [
        {"from": "N1", "to": "N2", "length_km": 2.0, "status": "BLOCKED"},
        {"from": "N1", "to": "N3", "length_km": 1.5, "status": "SAFE"},
        {"from": "N3", "to": "N2", "length_km": 1.5, "status": "SAFE"}
    ]
    res = find_shortest_route(nodes, edges, "N1", "N2")
    assert res["status"] == "SUCCESS"
    assert res["path"] == ["N1", "N3", "N2"]

# 11. test_stale_decision_becomes_conflict
def test_stale_decision_becomes_conflict():
    from app.services.recommendations import decide_recommendation
    from app.models.models import Recommendation
    db = SessionLocal()
    rec_id = f"rec_{uuid.uuid4().hex[:6]}"
    rec = Recommendation(
        id=rec_id,
        kind="CAMP_REDIRECT",
        decision_status="SUPERSEDED", # Already superseded
        snapshot_hash="hash123",
        valid_until=db.query(Camp).first().created_at
    )
    db.add(rec)
    db.commit()

    ok, msg, _ = decide_recommendation(db, rec_id, "APPROVED", "u_admin", "ADMIN", provided_snapshot_hash="hash123")
    assert ok is False
    assert "STALE_DECISION" in msg
    db.close()

# 12. test_audit_chain_detects_tampering
def test_audit_chain_detects_tampering():
    h1 = compute_entry_hash(GENESIS_HASH, "ACT1", "u1", "t1", "2026-09-24T12:00:00Z", {"k": "v"})
    h2 = compute_entry_hash(h1, "ACT2", "u2", "t2", "2026-09-24T12:01:00Z", {"k": "v2"})
    entries = [
        {"prev_hash": GENESIS_HASH, "hash": h1, "action": "ACT1", "actor_id": "u1", "target": "t1", "timestamp": "2026-09-24T12:00:00Z", "details": {"k": "v"}},
        {"prev_hash": h1, "hash": h2, "action": "ACT2", "actor_id": "u2", "target": "t2", "timestamp": "2026-09-24T12:01:00Z", "details": {"k": "v2"}}
    ]
    is_valid, _, _ = verify_audit_chain(entries)
    assert is_valid is True

    # Tamper with entry 1
    entries[0]["details"]["k"] = "TAMPERED"
    is_valid_bad, broken_idx, _ = verify_audit_chain(entries)
    assert is_valid_bad is False
    assert broken_idx == 0

# 13. test_staff_cannot_write_other_camp
def test_staff_cannot_write_other_camp():
    # Staff scoped only to camp_A
    staff_token = get_auth_token(email="staff.camp_a@floodops.gov", password="Staff@123")
    # Attempt to write to camp_B
    res = client.post(
        "/api/v1/camps/camp_B/occupancy",
        json={"delta": 10},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert res.status_code == 403
    assert "STAFF authorization denied" in res.json()["detail"]

# 14. test_llm_disabled_still_returns_explanation
def test_llm_disabled_still_returns_explanation():
    rec = {
        "id": "rec_test",
        "explanation": {
            "summary": "Camp A exceeds safe capacity. 80 redirected to Camp B.",
            "score_breakdown": [{"factor": "Capacity", "impact": "Prevents overflow"}]
        }
    }
    res = client.post("/api/v1/ai/explain", json={"recommendation": rec})
    assert res.status_code == 200
    assert "Camp A exceeds safe capacity" in res.json()["data"]["summary"]
    assert res.json()["data"]["provider"] == "deterministic-rules"
