import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import Base, engine, SessionLocal, Camp
from seed.seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()

def test_auth_login_and_roles():
    # 1. Authority login
    res_auth = client.post("/api/auth/login", json={"email": "collector@demo.gov", "password": "Collector@123"})
    assert res_auth.status_code == 200
    auth_token = res_auth.json()["access_token"]

    # 2. Public login
    res_pub = client.post("/api/auth/login", json={"email": "citizen@demo.in", "password": "Citizen@123"})
    assert res_pub.status_code == 200
    pub_token = res_pub.json()["access_token"]

    # 3. Public trying to access authority endpoint -> 403 Forbidden
    res_forbidden = client.get("/api/authority/dashboard", headers={"Authorization": f"Bearer {pub_token}"})
    assert res_forbidden.status_code == 403

    # 4. Authority accessing dashboard -> 200 OK
    res_ok = client.get("/api/authority/dashboard", headers={"Authorization": f"Bearer {auth_token}"})
    assert res_ok.status_code == 200
    assert "people_sheltered" in res_ok.json()

def test_public_endpoints():
    res_sum = client.get("/api/public/summary")
    assert res_sum.status_code == 200
    assert "overall_risk" in res_sum.json()

    res_ai = client.get("/api/public/ai-update?lang=en")
    assert res_ai.status_code == 200
    assert "headline" in res_ai.json()
    assert res_ai.json()["source"] in ["llm", "template"]

    res_zones = client.get("/api/public/zones")
    assert res_zones.status_code == 200
    assert "features" in res_zones.json()

    res_camps = client.get("/api/public/camps")
    assert res_camps.status_code == 200
    assert len(res_camps.json()) >= 5

def test_camp_patch_and_single_state_consistency():
    res_auth = client.post("/api/auth/login", json={"email": "collector@demo.gov", "password": "Collector@123"})
    token = res_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Patch Camp 01 to occupancy 950
    patch_res = client.patch(
        "/api/authority/camps/camp_01",
        json={"current_occupancy": 950},
        headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["current_occupancy"] == 950
    assert patch_res.json()["status"] in ["near_capacity", "full"]

    # Verify public camps reads exactly 950 occupancy
    pub_camps = client.get("/api/public/camps").json()
    c1 = next(c for c in pub_camps if c["camp_id"] == "camp_01")
    assert c1["available"] == 1000 - 950
    assert c1["status"] in ["near_capacity", "full"]

def test_camp_transfer():
    res_auth = client.post("/api/auth/login", json={"email": "collector@demo.gov", "password": "Collector@123"})
    token = res_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    transfer_res = client.post(
        "/api/authority/camps/transfer",
        json={"from_camp": "camp_01", "to_camp": "camp_02", "people": 100},
        headers=headers
    )
    assert transfer_res.status_code == 200
    assert transfer_res.json()["from_occupancy"] == 850
