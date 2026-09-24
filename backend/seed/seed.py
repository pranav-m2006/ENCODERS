"""
Seed script for FloodOps Synthetic District: 'Baran River Basin'.
Sets up initial camps, roads, gazetteer places, flood zones, rescue teams,
and users according to Contract A9 and Demo requirements.
"""
from datetime import datetime, timezone
import json
import sqlite3
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.models import (
    Base, engine, SessionLocal, User, Camp, CampState, Place, FloodZone,
    Road, RescueResource, RiverReading, WeatherObservation, SyncEvent, ResourceStock,
    RescueDirective, AuthorityInstruction, EvacuationGroup, Approval
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def ensure_schema():
    """Ensure SQLite tables have all required columns even after schema evolutions."""
    with engine.connect() as conn:
        # Check flood_zones columns
        try:
            fz_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(flood_zones)")).fetchall()]
            alter_fz = [
                ("current_probability", "FLOAT DEFAULT 0.45"),
                ("current_risk_category", "VARCHAR(20) DEFAULT 'Moderate'"),
                ("flooded_pct", "FLOAT DEFAULT 25.0"),
                ("needing_evacuation", "INTEGER DEFAULT 1200"),
                ("predicted_rain_cm", "FLOAT DEFAULT 15.0"),
                ("predicted_flood_depth_cm", "FLOAT DEFAULT 35.0"),
                ("time_to_flood_hours", "FLOAT DEFAULT 3.0"),
                ("centroid_lat", "FLOAT DEFAULT 25.22"),
                ("centroid_lng", "FLOAT DEFAULT 76.52"),
                ("flooded_roads", "JSON DEFAULT '[]'"),
                ("safe_corridors", "JSON DEFAULT '[]'"),
                ("advice", "TEXT DEFAULT 'Move to higher ground if in low-lying area.'")
            ]
            for col_name, col_def in alter_fz:
                if col_name not in fz_cols:
                    conn.execute(text(f"ALTER TABLE flood_zones ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] flood_zones schema check error: {e}")

        # Check camps columns
        try:
            c_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(camps)")).fetchall()]
            alter_c = [
                ("current_occupancy", "INTEGER DEFAULT 0"),
                ("inbound_occupancy", "INTEGER DEFAULT 0"),
                ("updated_by_role", "VARCHAR(50) DEFAULT 'authority'"),
                ("geofence_radius_m", "FLOAT DEFAULT 150.0"),
                ("urgent_needs", "JSON DEFAULT '[]'"),
                ("meals_available", "INTEGER DEFAULT 2000"),
                ("water_liters_available", "INTEGER DEFAULT 6000"),
                ("blankets_available", "INTEGER DEFAULT 500"),
                ("medical_kits_available", "INTEGER DEFAULT 50"),
                ("notes", "TEXT DEFAULT ''")
            ]
            for col_name, col_def in alter_c:
                if col_name not in c_cols:
                    conn.execute(text(f"ALTER TABLE camps ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] camps schema check error: {e}")

        # Check resources columns
        try:
            res_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(resources)")).fetchall()]
            alter_res = [
                ("food", "FLOAT DEFAULT 3000.0"),
                ("water", "FLOAT DEFAULT 15000.0"),
                ("medicine", "FLOAT DEFAULT 50.0"),
                ("beds", "FLOAT DEFAULT 800.0"),
                ("fuel", "FLOAT DEFAULT 250.0")
            ]
            for col_name, col_def in alter_res:
                if col_name not in res_cols:
                    conn.execute(text(f"ALTER TABLE resources ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] resources schema check error: {e}")

        # Check agent_events columns
        try:
            ae_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(agent_events)")).fetchall()]
            alter_ae = [
                ("input_summary", "TEXT DEFAULT ''"),
                ("output_summary", "TEXT DEFAULT ''"),
                ("related_zone", "VARCHAR(50)"),
                ("related_resource", "VARCHAR(50)")
            ]
            for col_name, col_def in alter_ae:
                if col_name not in ae_cols:
                    conn.execute(text(f"ALTER TABLE agent_events ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] agent_events schema check error: {e}")

        # Check rescue_resources columns
        try:
            rr_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(rescue_resources)")).fetchall()]
            alter_rr = [
                ("resource_id", "VARCHAR(50)"),
                ("type", "VARCHAR(50) DEFAULT 'Boat Rescue'"),
                ("capacity", "INTEGER DEFAULT 8"),
                ("assigned_zone", "VARCHAR(50)"),
                ("eta", "VARCHAR(50) DEFAULT '15 mins'"),
                ("contact_channel", "VARCHAR(50) DEFAULT 'VHF Channel 16'")
            ]
            for col_name, col_def in alter_rr:
                if col_name not in rr_cols:
                    conn.execute(text(f"ALTER TABLE rescue_resources ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] rescue_resources schema check error: {e}")

        # Check evacuation_groups columns
        try:
            eg_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(evacuation_groups)")).fetchall()]
            alter_eg = [
                ("name", "VARCHAR(100) DEFAULT 'Evacuation Group'"),
                ("source_zone", "VARCHAR(50)"),
                ("destination_camp", "VARCHAR(50)"),
                ("group_type", "VARCHAR(50) DEFAULT 'Boat Rescue'"),
                ("population", "INTEGER DEFAULT 50"),
                ("boats_count", "INTEGER DEFAULT 1"),
                ("personnel_count", "INTEGER DEFAULT 4"),
                ("air_drop_kits", "INTEGER DEFAULT 0"),
                ("vehicles_count", "INTEGER DEFAULT 1"),
                ("eta", "VARCHAR(50) DEFAULT '15 mins'")
            ]
            for col_name, col_def in alter_eg:
                if col_name not in eg_cols:
                    conn.execute(text(f"ALTER TABLE evacuation_groups ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] evacuation_groups schema check error: {e}")

        # Check camp_movements columns
        try:
            cm_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(camp_movements)")).fetchall()]
            alter_cm = [
                ("status", "VARCHAR(20) DEFAULT 'arrived'"),
                ("source_zone", "VARCHAR(100)"),
                ("transport_type", "VARCHAR(100) DEFAULT 'Camp Transfer Bus'")
            ]
            for col_name, col_def in alter_cm:
                if col_name not in cm_cols:
                    conn.execute(text(f"ALTER TABLE camp_movements ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] camp_movements schema check error: {e}")

        # Check weather_observations columns
        try:
            wo_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(weather_observations)")).fetchall()]
            alter_wo = [
                ("type", "VARCHAR(50) DEFAULT 'weather'"),
                ("value", "FLOAT DEFAULT 38.5")
            ]
            for col_name, col_def in alter_wo:
                if col_name not in wo_cols:
                    conn.execute(text(f"ALTER TABLE weather_observations ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] weather_observations schema check error: {e}")

        # Check authority_instructions columns
        try:
            ai_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(authority_instructions)")).fetchall()]
            alter_ai = [
                ("level", "VARCHAR(20) DEFAULT 'Warning'"),
                ("language", "VARCHAR(10) DEFAULT 'en'"),
                ("target_zone", "VARCHAR(100) DEFAULT 'All Zones'"),
                ("target_zones", "JSON DEFAULT '[]'"),
                ("predicted_rain_cm", "FLOAT DEFAULT 15.0"),
                ("predicted_flood_cm", "FLOAT DEFAULT 35.0"),
                ("ai_suggested", "BOOLEAN DEFAULT 0"),
                ("confirmed_by_authority", "BOOLEAN DEFAULT 1"),
                ("retracted", "BOOLEAN DEFAULT 0"),
                ("radio_script", "TEXT DEFAULT ''"),
                ("published_by", "VARCHAR(100) DEFAULT 'District Disaster Authority'")
            ]
            for col_name, col_def in alter_ai:
                if col_name not in ai_cols:
                    conn.execute(text(f"ALTER TABLE authority_instructions ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] authority_instructions schema check error: {e}")

        # Check rescue_directives table
        try:
            rd_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(rescue_directives)")).fetchall()]
            if rd_cols:
                alter_rd = [
                    ("target_zone", "VARCHAR(100) DEFAULT 'ZONE-2'"),
                    ("location_name", "VARCHAR(150) DEFAULT 'Lowland Sector'"),
                    ("lat", "FLOAT DEFAULT 25.20"),
                    ("lng", "FLOAT DEFAULT 76.50"),
                    ("people_count", "INTEGER DEFAULT 25"),
                    ("arrived_count", "INTEGER DEFAULT 0"),
                    ("urgency", "VARCHAR(20) DEFAULT 'Critical'"),
                    ("how_to_rescue", "TEXT DEFAULT ''"),
                    ("assigned_camp_id", "VARCHAR(50) DEFAULT 'camp_01'"),
                    ("assigned_camp_name", "VARCHAR(150) DEFAULT 'Relief Camp'"),
                    ("equipment_needed", "JSON DEFAULT '[]'"),
                    ("vulnerabilities", "JSON DEFAULT '{}'"),
                    ("status", "VARCHAR(30) DEFAULT 'assigned'"),
                    ("operator_notes", "TEXT DEFAULT ''")
                ]
                for col_name, col_def in alter_rd:
                    if col_name not in rd_cols:
                        conn.execute(text(f"ALTER TABLE rescue_directives ADD COLUMN {col_name} {col_def}"))
        except Exception as e:
            print(f"[Schema] rescue_directives schema check error: {e}")

        conn.commit()

def seed_database(db: Session):
    Base.metadata.create_all(bind=engine)
    ensure_schema()

    now = datetime.now(timezone.utc)

    # 1. Users
    user_definitions = [
        {"name": "District Collector", "email": "collector@demo.gov", "password": "Collector@123", "role": "ADMIN", "district": "Baran River Basin", "camp_ids": [], "team_ids": []},
        {"name": "Concerned Citizen", "email": "citizen@demo.in", "password": "Citizen@123", "role": "PUBLIC", "district": "Baran River Basin", "camp_ids": [], "team_ids": []},
        {"name": "District Collector Admin", "email": "admin@floodops.gov", "password": "Admin@123", "role": "ADMIN", "district": "Baran River Basin", "camp_ids": [], "team_ids": []},
        {"name": "Concerned Citizen Org", "email": "citizen@demo.org", "password": "Citizen@123", "role": "PUBLIC", "district": "Baran River Basin", "camp_ids": [], "team_ids": []},
        {"name": "Camp A Lead Officer", "email": "staff.camp_a@floodops.gov", "password": "Staff@123", "role": "STAFF", "district": "Baran River Basin", "camp_ids": ["camp_A", "camp_01"], "team_ids": ["TEAM-1"]},
        {"name": "Camp B Lead Officer", "email": "staff.camp_b@floodops.gov", "password": "Staff@123", "role": "STAFF", "district": "Baran River Basin", "camp_ids": ["camp_B", "camp_02"], "team_ids": ["TEAM-2"]},
    ]

    for u_data in user_definitions:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            db.add(User(
                name=u_data["name"],
                email=u_data["email"],
                password_hash=hash_password(u_data["password"]),
                role=u_data["role"],
                camp_ids=u_data["camp_ids"],
                team_ids=u_data["team_ids"],
                district=u_data["district"]
            ))
        else:
            existing.password_hash = hash_password(u_data["password"])
            existing.role = u_data["role"]
            existing.camp_ids = u_data["camp_ids"]
            existing.team_ids = u_data["team_ids"]

    db.commit()

    # 2. Camps
    camps_data = [
        # Demo drawer & automated test camps
        {"id": "camp_01", "name": "St. Aloysius School A", "cap": 1000, "occ": 700, "lat": 25.21, "lng": 76.51, "status": "open"},
        {"id": "camp_02", "name": "Govt High School Edathua B", "cap": 800, "occ": 200, "lat": 25.26, "lng": 76.54, "status": "open"},
        {"id": "camp_03", "name": "Kuttanad Community Hall C", "cap": 1200, "occ": 150, "lat": 25.18, "lng": 76.48, "status": "open"},
        {"id": "camp_04", "name": "District Sports Stadium D", "cap": 2000, "occ": 50, "lat": 25.29, "lng": 76.45, "status": "open"},
        {"id": "camp_05", "name": "Riverside Shelter E", "cap": 400, "occ": 380, "lat": 25.15, "lng": 76.52, "status": "unsafe"},
        # Baran River Basin contract camps
        {"id": "camp_A", "name": "Central Higher Secondary School", "cap": 1000, "occ": 700, "lat": 25.21, "lng": 76.51, "status": "open"},
        {"id": "camp_B", "name": "Highland Community Center", "cap": 600, "occ": 200, "lat": 25.26, "lng": 76.54, "status": "open"},
        {"id": "camp_C", "name": "District Sports Complex", "cap": 800, "occ": 150, "lat": 25.18, "lng": 76.48, "status": "open"},
        {"id": "camp_D", "name": "North Hills Academy", "cap": 500, "occ": 50, "lat": 25.29, "lng": 76.45, "status": "open"},
        {"id": "camp_E", "name": "Riverside Shelter", "cap": 400, "occ": 380, "lat": 25.15, "lng": 76.52, "status": "unsafe"},
        {"id": "camp_F", "name": "East Valley Depot", "cap": 600, "occ": 100, "lat": 25.22, "lng": 76.60, "status": "open"}
    ]

    for c in camps_data:
        camp = db.query(Camp).filter(Camp.camp_id == c["id"]).first()
        if not camp:
            camp = Camp(
                camp_id=c["id"],
                name=c["name"],
                capacity=c["cap"],
                current_occupancy=c["occ"],
                inbound_occupancy=0,
                lat=c["lat"],
                lng=c["lng"],
                status=c["status"],
                risk_level="LOW" if c["status"] == "open" else "HIGH",
                meals_available=max(500, c["cap"] * 3),
                water_liters_available=max(2000, c["cap"] * 15),
                blankets_available=c["cap"],
                medical_kits_available=50
            )
            db.add(camp)
        else:
            camp.name = c["name"]
            camp.capacity = c["cap"]
            camp.current_occupancy = c["occ"]
            camp.lat = c["lat"]
            camp.lng = c["lng"]
            camp.status = c["status"]

        # Ensure CampState
        c_state = db.query(CampState).filter(CampState.camp_id == c["id"]).first()
        if not c_state:
            c_state = CampState(
                camp_id=c["id"],
                occupied=c["occ"],
                reserved=0,
                projected=c["occ"],
                available=max(0, c["cap"] - c["occ"]),
                fill_band="AMBER" if c["occ"] / c["cap"] >= 0.70 else "GREEN",
                version=1
            )
            db.add(c_state)
        else:
            c_state.occupied = c["occ"]
            c_state.projected = c["occ"]
            c_state.available = max(0, c["cap"] - c["occ"])
            c_state.fill_band = "AMBER" if c["occ"] / c["cap"] >= 0.70 else "GREEN"

        # Ensure ResourceStock
        st = db.query(ResourceStock).filter(ResourceStock.camp_id == c["id"]).first()
        if not st:
            st = ResourceStock(
                camp_id=c["id"],
                food=c["cap"] * 3.0,
                water=c["cap"] * 15.0,
                medicine=50.0,
                beds=c["cap"] * 0.8,
                fuel=250.0,
                food_meals=c["cap"] * 3.0,
                water_liters=c["cap"] * 15.0,
                medicine_kits=50.0,
                version=1
            )
            db.add(st)

    db.commit()

    # 3. Flood Zones
    zones = [
        {"id": "ZONE-1", "name": "Baran Upper Catchment", "elev": 32.0, "pop": 8000, "risk": "LOW", "prob": 0.20, "cat": "Low", "rain": 5.0, "depth": 10.0, "time": 8.0, "lat": 25.28, "lng": 76.46},
        {"id": "ZONE-2", "name": "Riverside Lowlands", "elev": 12.0, "pop": 12000, "risk": "HIGH", "prob": 0.85, "cat": "High", "rain": 22.0, "depth": 65.0, "time": 2.0, "lat": 25.20, "lng": 76.50},
        {"id": "ZONE-3", "name": "Old Town Delta", "elev": 9.5, "pop": 18000, "risk": "SEVERE", "prob": 0.92, "cat": "Critical", "rain": 28.0, "depth": 90.0, "time": 1.5, "lat": 25.21, "lng": 76.51},
        {"id": "ZONE-4", "name": "Industrial Canal Sector", "elev": 14.0, "pop": 6500, "risk": "MODERATE", "prob": 0.55, "cat": "Medium", "rain": 14.0, "depth": 35.0, "time": 4.0, "lat": 25.24, "lng": 76.53},
        {"id": "ZONE-5", "name": "North Ridge", "elev": 45.0, "pop": 4000, "risk": "LOW", "prob": 0.15, "cat": "Low", "rain": 6.0, "depth": 5.0, "time": 12.0, "lat": 25.27, "lng": 76.54},
        {"id": "ZONE-6", "name": "East Valley Basin", "elev": 18.0, "pop": 7200, "risk": "LOW", "prob": 0.35, "cat": "Low", "rain": 10.0, "depth": 20.0, "time": 6.0, "lat": 25.26, "lng": 76.55},
        {"id": "ZONE-7", "name": "South Agricultural Flat", "elev": 13.5, "pop": 5300, "risk": "MODERATE", "prob": 0.60, "cat": "Medium", "rain": 16.0, "depth": 40.0, "time": 3.5, "lat": 25.16, "lng": 76.46},
        {"id": "ZONE-8", "name": "Confluence Wetland", "elev": 8.0, "pop": 3100, "risk": "SEVERE", "prob": 0.95, "cat": "Critical", "rain": 30.0, "depth": 110.0, "time": 1.0, "lat": 25.13, "lng": 76.53}
    ]
    for z in zones:
        zone = db.query(FloodZone).filter(FloodZone.zone_id == z["id"]).first()
        if not zone:
            zone = FloodZone(
                zone_id=z["id"],
                name=z["name"],
                elevation=z["elev"],
                population=z["pop"],
                risk_band=z["risk"],
                current_probability=z["prob"],
                current_risk_category=z["cat"],
                flooded_pct=round(z["prob"] * 50, 1),
                needing_evacuation=int(z["pop"] * z["prob"] * 0.25),
                predicted_rain_cm=z["rain"],
                predicted_flood_depth_cm=z["depth"],
                time_to_flood_hours=z["time"],
                centroid_lat=z["lat"],
                centroid_lng=z["lng"],
                advice="Move to higher ground if in low-lying area."
            )
            db.add(zone)
        else:
            zone.current_probability = z["prob"]
            zone.current_risk_category = z["cat"]
            zone.flooded_pct = round(z["prob"] * 50, 1)
            zone.needing_evacuation = int(z["pop"] * z["prob"] * 0.25)
            zone.predicted_rain_cm = z["rain"]
            zone.predicted_flood_depth_cm = z["depth"]
            zone.time_to_flood_hours = z["time"]
            zone.centroid_lat = z["lat"]
            zone.centroid_lng = z["lng"]

    db.commit()

    # 4. Gazetteer Places
    places = [
        {"id": "pl_1", "name": "Kishanpur Village", "type": "village", "lat": 25.19, "lng": 76.49, "zone": "ZONE-2"},
        {"id": "pl_2", "name": "Sita Kund Ghat", "type": "landmark", "lat": 25.20, "lng": 76.50, "zone": "ZONE-2"},
        {"id": "pl_3", "name": "Mandir Chauraha", "type": "landmark", "lat": 25.21, "lng": 76.51, "zone": "ZONE-3"},
        {"id": "pl_4", "name": "Shastri Nagar Market", "type": "village", "lat": 25.22, "lng": 76.52, "zone": "ZONE-3"},
        {"id": "pl_5", "name": "Railway Crossing Junction", "type": "landmark", "lat": 25.24, "lng": 76.53, "zone": "ZONE-4"},
        {"id": "pl_6", "name": "Neelkanth Mahadev Mandir", "type": "landmark", "lat": 25.27, "lng": 76.54, "zone": "ZONE-5"},
        {"id": "pl_7", "name": "Govindgarh Village", "type": "village", "lat": 25.26, "lng": 76.55, "zone": "ZONE-6"},
        {"id": "pl_8", "name": "Grain Silos Depot", "type": "landmark", "lat": 25.23, "lng": 76.58, "zone": "ZONE-6"},
        {"id": "pl_9", "name": "Rampura Hamlet", "type": "village", "lat": 25.16, "lng": 76.46, "zone": "ZONE-7"},
        {"id": "pl_10", "name": "Canal Sluice Gate 4", "type": "landmark", "lat": 25.17, "lng": 76.47, "zone": "ZONE-7"},
        {"id": "pl_11", "name": "Wetland Watchtower", "type": "landmark", "lat": 25.13, "lng": 76.53, "zone": "ZONE-8"},
        {"id": "pl_12", "name": "Fisheries Cooperative", "type": "village", "lat": 25.14, "lng": 76.54, "zone": "ZONE-8"}
    ]
    for p in places:
        if not db.query(Place).filter(Place.place_id == p["id"]).first():
            db.add(Place(
                place_id=p["id"],
                name=p["name"],
                type=p["type"],
                lat=p["lat"],
                lng=p["lng"],
                zone_id=p["zone"]
            ))

    # 5. Roads
    roads = [
        {"id": "R1", "from": "camp_A", "to": "camp_B", "length": 6.5, "status": "SAFE"},
        {"id": "R2", "from": "camp_A", "to": "camp_C", "length": 4.2, "status": "SAFE"},
        {"id": "R3", "from": "camp_B", "to": "camp_D", "length": 8.1, "status": "SAFE"},
        {"id": "R4", "from": "camp_C", "to": "camp_E", "length": 5.0, "status": "CAUTION"},
        {"id": "R5", "from": "camp_A", "to": "camp_F", "length": 7.3, "status": "SAFE"},
        {"id": "R12", "from": "ZONE-2", "to": "camp_A", "length": 3.5, "status": "SAFE"},
        {"id": "R13", "from": "ZONE-2", "to": "camp_B", "length": 5.8, "status": "SAFE"},
        {"id": "R14", "from": "ZONE-3", "to": "camp_A", "length": 2.8, "status": "SAFE"},
        {"id": "R15", "from": "ZONE-3", "to": "camp_B", "length": 6.2, "status": "SAFE"},
        {"id": "R20", "from": "ZONE-8", "to": "camp_E", "length": 3.0, "status": "BLOCKED"}
    ]
    for r in roads:
        if not db.query(Road).filter(Road.road_id == r["id"]).first():
            db.add(Road(
                road_id=r["id"],
                name=f"Road {r['id']}",
                from_node=r["from"],
                to_node=r["to"],
                length_km=r["length"],
                status=r["status"]
            ))

    # 6. Rescue Teams
    for i in range(1, 11):
        team_id = f"TEAM-{i}"
        unit = db.query(RescueResource).filter((RescueResource.team_id == team_id) | (RescueResource.resource_id == team_id)).first()
        if not unit:
            db.add(RescueResource(
                resource_id=team_id,
                team_id=team_id,
                name=f"NDRF Squad {i}",
                type="Boat Rescue" if i <= 6 else "Ground Evacuation",
                personnel=8,
                has_boat=(i <= 6),
                status="available",
                lat=25.20 + (i * 0.01),
                lng=76.50 + (i * 0.01)
            ))
        else:
            unit.resource_id = team_id
            unit.status = "available"

    # 7. Sensors
    if not db.query(RiverReading).first():
        db.add(RiverReading(
            gauge_id="GAUGE-2",
            gauge_name="Midstream Bridge",
            stage_meters=7.8,
            rate_of_rise_m_per_h=0.25,
            warning_level_m=7.5,
            danger_level_m=8.5
        ))
    if not db.query(WeatherObservation).filter(WeatherObservation.type == "rain").first():
        db.add(WeatherObservation(
            type="rain",
            value=38.5,
            temperature=27.5,
            rainfall_rate_mm=14.0,
            predicted_rain_6h_mm=45.0,
            source="open_meteo"
        ))
    if not db.query(WeatherObservation).filter(WeatherObservation.type == "river").first():
        db.add(WeatherObservation(
            type="river",
            value=4.65,
            temperature=27.5,
            rainfall_rate_mm=14.0,
            predicted_rain_6h_mm=45.0,
            source="gauge"
        ))

    # 8. Rescue Directives
    if not db.query(RescueDirective).first():
        db.add(RescueDirective(
            id="DIR-101",
            target_zone="ZONE-2",
            location_name="Sector 4 - Lowland Settlement",
            lat=25.215,
            lng=76.512,
            people_count=32,
            arrived_count=0,
            urgency="Critical",
            how_to_rescue="Deploy NDRF Boat Team 2 along western canal.",
            assigned_camp_id="camp_01",
            assigned_camp_name="St. Aloysius School A",
            equipment_needed=["Inflatable Boats", "Life Vests", "Ropes"],
            vulnerabilities={"children": 8, "elderly": 6, "medical": 2},
            status="in_transit",
            operator_notes="Dispatched at 00:15 UTC. Radio contact established."
        ))
        db.add(RescueDirective(
            id="DIR-102",
            target_zone="ZONE-1",
            location_name="Sector 7 - Riverside Hamlet",
            lat=25.234,
            lng=76.495,
            people_count=18,
            arrived_count=0,
            urgency="High",
            how_to_rescue="Use high-clearance amphibious vehicle via northern corridor.",
            assigned_camp_id="camp_02",
            assigned_camp_name="Govt High School Edathua B",
            equipment_needed=["Amphibious Truck", "First Aid"],
            vulnerabilities={"children": 4, "elderly": 3, "medical": 1},
            status="assigned",
            operator_notes="Pending bridge clearance check."
        ))

    # 9. Authority Instructions
    if not db.query(AuthorityInstruction).first():
        db.add(AuthorityInstruction(
            id="INST-001",
            title="Red Alert: Flash Inundation Predicted for Zone-2",
            body="Immediate precautionary evacuation ordered for all riverside lowlands. Safe passage open via North Bridge.",
            severity="WARNING",
            level="Warning",
            language="en",
            target_zone="ZONE-2",
            target_zones=["ZONE-2"],
            predicted_rain_cm=18.5,
            predicted_flood_cm=42.0,
            ai_suggested=True,
            confirmed_by_authority=True,
            retracted=False,
            radio_script="All residents of Sector 4 and surrounding riverbanks, please move calmly toward St. Aloysius School A.",
            published_by="District Disaster Management Authority"
        ))

    # 10. Evacuation Groups
    initial_groups = [
        {
            "group_id": "grp_ndrf_charlie",
            "name": "NDRF Boat Squad Charlie",
            "source_zone": "velachery",
            "source_zone_id": "ZONE-2",
            "destination_camp": "camp_01",
            "assigned_camp_id": "camp_01",
            "group_type": "boat",
            "population": 85,
            "boats_count": 3,
            "personnel_count": 8,
            "air_drop_kits": 0,
            "vehicles_count": 1,
            "eta": "12 mins",
            "status": "waiting",
            "location_name": "Velachery Ward 178 / Pallikaranai Marsh Edge"
        },
        {
            "group_id": "grp_sdrf_alpha",
            "name": "SDRF Tactical Rescue Team 2",
            "source_zone": "mudichur",
            "source_zone_id": "ZONE-2",
            "destination_camp": "camp_02",
            "assigned_camp_id": "camp_02",
            "group_type": "ground_team",
            "population": 120,
            "boats_count": 1,
            "personnel_count": 12,
            "air_drop_kits": 0,
            "vehicles_count": 2,
            "eta": "18 mins",
            "status": "waiting",
            "location_name": "Mudichur High Road / Varadharajapuram"
        },
        {
            "group_id": "grp_iaf_air_drop",
            "name": "IAF Drone Air-Drop Squadron",
            "source_zone": "saidapet",
            "source_zone_id": "ZONE-3",
            "destination_camp": "camp_03",
            "assigned_camp_id": "camp_03",
            "group_type": "air_supply",
            "population": 65,
            "boats_count": 0,
            "personnel_count": 4,
            "air_drop_kits": 25,
            "vehicles_count": 0,
            "eta": "8 mins",
            "status": "moving",
            "location_name": "Saidapet Maraimalai Adigal Bridge Lowlands"
        },
        {
            "group_id": "grp_amphibious_truck",
            "name": "Amphibious Evac Convoy Delta",
            "source_zone": "perumbakkam",
            "source_zone_id": "ZONE-4",
            "destination_camp": "camp_04",
            "assigned_camp_id": "camp_04",
            "group_type": "high_truck",
            "population": 140,
            "boats_count": 0,
            "personnel_count": 10,
            "air_drop_kits": 0,
            "vehicles_count": 4,
            "eta": "15 mins",
            "status": "moving",
            "location_name": "Perumbakkam Housing Board Sector"
        },
        {
            "group_id": "grp_coastguard_echo",
            "name": "Indian Coast Guard Inflatable Fleet Echo",
            "source_zone": "kolathur",
            "source_zone_id": "ZONE-1",
            "destination_camp": "camp_01",
            "assigned_camp_id": "camp_01",
            "group_type": "boat",
            "population": 95,
            "boats_count": 4,
            "personnel_count": 14,
            "air_drop_kits": 0,
            "vehicles_count": 1,
            "eta": "Arrived",
            "status": "arrived",
            "location_name": "Kolathur Lake Spillway Basin"
        },
        {
            "group_id": "grp_tn_fire_foxtrot",
            "name": "TN Fire & Rescue Quick Response Foxtrot",
            "source_zone": "sholinganallur",
            "source_zone_id": "ZONE-6",
            "destination_camp": "camp_02",
            "assigned_camp_id": "camp_02",
            "group_type": "ground_team",
            "population": 75,
            "boats_count": 1,
            "personnel_count": 8,
            "air_drop_kits": 0,
            "vehicles_count": 2,
            "eta": "Arrived",
            "status": "arrived",
            "location_name": "OMR Canal Embankment"
        }
    ]

    for g_data in initial_groups:
        grp = db.query(EvacuationGroup).filter(EvacuationGroup.group_id == g_data["group_id"]).first()
        if not grp:
            db.add(EvacuationGroup(
                group_id=g_data["group_id"],
                name=g_data["name"],
                source_zone=g_data["source_zone"],
                source_zone_id=g_data["source_zone_id"],
                destination_camp=g_data["destination_camp"],
                assigned_camp_id=g_data["assigned_camp_id"],
                group_type=g_data["group_type"],
                population=g_data["population"],
                boats_count=g_data["boats_count"],
                personnel_count=g_data["personnel_count"],
                air_drop_kits=g_data["air_drop_kits"],
                vehicles_count=g_data["vehicles_count"],
                eta=g_data["eta"],
                status=g_data["status"],
                location_name=g_data["location_name"]
            ))

    # 11. Approvals (Pending & Audited History)
    initial_approvals = [
        {
            "id": "app_boat_dispatch_01",
            "type": "dispatch",
            "payload": {
                "unit_id": "TEAM-1",
                "unit_name": "NDRF Squad 1",
                "zone_id": "ZONE-2",
                "zone_name": "Velachery Lowlands",
                "boats": 2,
                "people": 60,
                "priority": "CRITICAL"
            },
            "reason": "Authorize urgent deployment of 2 Motorized Inflatable Rescue Boats to Velachery Sector 4 due to projected 65cm flash flood depth.",
            "confidence": 0.94,
            "status": "pending",
            "decided_by": None,
            "decision_note": None,
            "decided_at": None
        },
        {
            "id": "app_camp_redirect_02",
            "type": "camp_redirect",
            "payload": {
                "from_camp_id": "camp_01",
                "from_camp_name": "St. Aloysius School A",
                "to_camp_id": "camp_04",
                "to_camp_name": "District Sports Stadium D",
                "people": 120,
                "from_before": 700,
                "from_capacity": 1000,
                "to_free": 1950
            },
            "reason": "Divert incoming evacuation convoy (120 citizens) from St. Aloysius School A (88% occupancy threshold reached) to District Sports Stadium D.",
            "confidence": 0.91,
            "status": "pending",
            "decided_by": None,
            "decision_note": None,
            "decided_at": None
        },
        {
            "id": "app_emergency_supply_03",
            "type": "supply",
            "payload": {
                "camp_id": "camp_02",
                "camp_name": "Govt High School Edathua B",
                "item": "water_packets",
                "quantity": 3000,
                "transport": "air_drop"
            },
            "reason": "Emergency air-drop supply requisition: Dispatch 3,000 clean drinking water packets and 150 pediatric medical kits to Mudichur relief camp.",
            "confidence": 0.88,
            "status": "pending",
            "decided_by": None,
            "decision_note": None,
            "decided_at": None
        },
        {
            "id": "app_ai_camp_proposal_04",
            "type": "ai_camp_proposal",
            "payload": {
                "candidate_id": "cand_guru_nanak",
                "name": "Guru Nanak College Indoor Auditorium",
                "capacity": 1500,
                "area": "Velachery",
                "elevation_m": 14.5
            },
            "reason": "Activate Guru Nanak College Indoor Auditorium as auxiliary overflow relief center for Adyar Basin flood evacuees.",
            "confidence": 0.96,
            "status": "pending",
            "decided_by": None,
            "decision_note": None,
            "decided_at": None
        },
        {
            "id": "app_hist_transfer_01",
            "type": "transfer",
            "payload": {
                "from_camp_id": "camp_05",
                "to_camp_id": "camp_03",
                "people": 80
            },
            "reason": "Precautionary transfer of 80 vulnerable evacuees from Riverside Shelter to Kuttanad Community Hall C due to river gauge surge.",
            "confidence": 0.95,
            "status": "approved",
            "decided_by": "District Collector",
            "decision_note": "Approved and executed via South Bypass corridor.",
            "decided_at": now
        },
        {
            "id": "app_hist_dispatch_02",
            "type": "dispatch",
            "payload": {
                "unit_id": "TEAM-4",
                "unit_name": "NDRF Squad 4",
                "zone_id": "ZONE-5"
            },
            "reason": "Deploy amphibious tactical reconnaissance team to North Ridge for road passability verification.",
            "confidence": 0.85,
            "status": "approved",
            "decided_by": "District Collector",
            "decision_note": "Authorized routine tactical sweep.",
            "decided_at": now
        },
        {
            "id": "app_hist_reject_03",
            "type": "dispatch",
            "payload": {
                "unit_id": "TEAM-8",
                "unit_name": "NDRF Squad 8",
                "zone_id": "ZONE-8"
            },
            "reason": "Deploy non-motorized rubber raft to Confluence Wetland during peak discharge torrent.",
            "confidence": 0.62,
            "status": "rejected",
            "decided_by": "District Collector",
            "decision_note": "Rejected due to extreme water current speed. Heavy motorized vessel required instead.",
            "decided_at": now
        }
    ]

    for a_data in initial_approvals:
        app_rec = db.query(Approval).filter(Approval.id == a_data["id"]).first()
        if not app_rec:
            db.add(Approval(
                id=a_data["id"],
                type=a_data["type"],
                payload=a_data["payload"],
                reason=a_data["reason"],
                confidence=a_data["confidence"],
                status=a_data["status"],
                decided_by=a_data["decided_by"],
                decision_note=a_data["decision_note"],
                decided_at=a_data["decided_at"]
            ))

    db.commit()
    print("[Seed] Synthetic district 'Baran River Basin' seeded successfully!")

if __name__ == "__main__":
    db = SessionLocal()
    seed_database(db)
    db.close()
