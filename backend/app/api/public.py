from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.models.models import get_db, Zone, Camp, Announcement, Observation, Prediction
from app.schemas.schemas import (
    PublicSummary, PublicAiUpdate, PublicCamp, PublicAnnouncement,
    PublicForecast, AssistantRequest, AssistantResponse, RiverInfo, AlertItem,
    RiverPoint, RainPoint, ZoneForecast, FacilityDict,
    MyLocationRiskRequest, MyLocationRiskResponse,
    AutoCheckinRequest, AutoCheckinResponse
)
from app.services.briefing import briefing_service
from app.services.assistant import assistant_service
from app.services.state import state_manager

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/summary", response_model=PublicSummary)
def get_public_summary(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    camps = db.query(Camp).all()

    max_prob = max([z.current_probability for z in zones]) if zones else 0.45
    if max_prob > 0.75:
        overall_risk = "Critical"
    elif max_prob > 0.50:
        overall_risk = "High"
    elif max_prob > 0.30:
        overall_risk = "Medium"
    else:
        overall_risk = "Low"

    total_sheltered = sum([c.current_occupancy for c in camps])
    camps_open = len([c for c in camps if c.status != "closed"])
    camps_total = len(camps)

    alerts = []
    for z in zones:
        if z.current_risk_category in ["Critical", "High"]:
            rain_cm = z.predicted_rain_cm or 20.0
            flood_cm = z.predicted_flood_depth_cm or 45.0
            alerts.append(AlertItem(
                id=f"alt_{z.zone_id}",
                level=z.current_risk_category,
                title=f"{z.name}: Rain {rain_cm}cm, Predicted Flood {flood_cm}cm ({z.time_to_flood_hours or 2.0}h to peak)",
                zone_id=z.zone_id
            ))

    river_obs = db.query(Observation).filter(Observation.type == "river").order_by(Observation.fetched_at.desc()).first()
    river_level = river_obs.value if river_obs else 4.65

    return PublicSummary(
        overall_risk=overall_risk,
        updated_at=datetime.now(timezone.utc).isoformat(),
        people_sheltered=total_sheltered,
        camps_open=camps_open,
        camps_total=camps_total,
        alerts=alerts,
        river=RiverInfo(
            level_m=round(river_level, 2),
            alert_level_m=4.80,
            trend="rising" if river_level > 4.40 else "steady"
        )
    )

@router.get("/ai-update", response_model=PublicAiUpdate)
async def get_public_ai_update(lang: str = Query("en"), db: Session = Depends(get_db)):
    update = await briefing_service.get_public_ai_update(db, lang=lang)
    return update

@router.get("/zones")
def get_public_zones(db: Session = Depends(get_db)) -> Dict[str, Any]:
    zones = db.query(Zone).all()
    features = []
    for z in zones:
        geom = z.geojson_geometry or {
            "type": "Polygon",
            "coordinates": [[[z.centroid_lng - 0.02, z.centroid_lat - 0.02],
                             [z.centroid_lng + 0.02, z.centroid_lat - 0.02],
                             [z.centroid_lng + 0.02, z.centroid_lat + 0.02],
                             [z.centroid_lng - 0.02, z.centroid_lat + 0.02],
                             [z.centroid_lng - 0.02, z.centroid_lat - 0.02]]]
        }
        feat = {
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "zone_id": z.zone_id,
                "name": z.name,
                "risk_category": z.current_risk_category,
                "probability": z.current_probability,
                "predicted_rain_cm": z.predicted_rain_cm or 15.0,
                "predicted_flood_depth_cm": z.predicted_flood_depth_cm or 35.0,
                "time_to_flood_hours": z.time_to_flood_hours or 3.0,
                "flooded_pct": z.flooded_pct,
                "flooded_roads": z.flooded_roads or [],
                "safe_corridors": z.safe_corridors or [],
                "advice": z.advice
            }
        }
        features.append(feat)

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/camps", response_model=List[PublicCamp])
def get_public_camps(db: Session = Depends(get_db)):
    camps = db.query(Camp).all()
    out = []
    for c in camps:
        fac = c.facilities if isinstance(c.facilities, dict) else {"water": True, "medical": True, "toilets": True, "power": True, "food": True, "baby_care": True}
        out.append(PublicCamp(
            camp_id=c.camp_id,
            name=c.name,
            lat=c.lat,
            lng=c.lng,
            capacity=c.capacity,
            available=max(0, c.capacity - c.current_occupancy),
            current_occupancy=c.current_occupancy,
            status=c.status,
            facilities=FacilityDict(**fac),
            contact=f"{c.contact_name} ({c.contact_phone})",
            updated_at=c.updated_at.isoformat() if c.updated_at else datetime.now(timezone.utc).isoformat(),
            updated_by_role=c.updated_by_role or "authority",
            geofence_radius_m=c.geofence_radius_m or 150.0,
            urgent_needs=c.urgent_needs or [],
            meals_available=c.meals_available or 2000,
            water_liters_available=c.water_liters_available or 6000,
            blankets_available=c.blankets_available or 500,
            medical_kits_available=c.medical_kits_available or 50
        ))
    return out

@router.post("/my-location-risk", response_model=MyLocationRiskResponse)
def evaluate_my_location_risk(req: MyLocationRiskRequest, db: Session = Depends(get_db)):
    risk_info = state_manager.get_my_location_risk(db, req.lat, req.lng)
    return MyLocationRiskResponse(**risk_info)

@router.post("/camps/{camp_id}/auto-checkin", response_model=AutoCheckinResponse)
async def auto_checkin_camp_endpoint(
    camp_id: str,
    req: AutoCheckinRequest,
    db: Session = Depends(get_db)
):
    try:
        res = await state_manager.auto_checkin_camp(
            db=db,
            camp_id=camp_id,
            people_count=req.people_count,
            source_zone=req.source_zone or "Live Citizen GPS Geofence"
        )
        return AutoCheckinResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/announcements", response_model=List[PublicAnnouncement])
def get_public_announcements(db: Session = Depends(get_db)):
    announcements = db.query(Announcement).filter(
        Announcement.retracted == False,
        Announcement.confirmed_by_authority == True
    ).order_by(Announcement.published_at.desc()).all()
    return [
        PublicAnnouncement(
            id=a.id,
            title=a.title,
            body=a.body,
            language=a.language,
            level=a.level,
            published_at=a.published_at.isoformat() if a.published_at else datetime.now(timezone.utc).isoformat(),
            published_by=a.published_by,
            target_zone=a.target_zone or "All Chennai Zones",
            predicted_rain_cm=a.predicted_rain_cm,
            predicted_flood_cm=a.predicted_flood_cm,
            ai_suggested=a.ai_suggested or False,
            confirmed_by_authority=a.confirmed_by_authority or True
        )
        for a in announcements
    ]

@router.get("/forecast", response_model=PublicForecast)
def get_public_forecast(db: Session = Depends(get_db)):
    zones = db.query(Zone).all()
    now = datetime.now(timezone.utc)

    # Simulated Adyar river time series
    river_series = []
    for h in range(-6, 7):
        t_str = (now + timedelta(hours=h)).strftime("%H:%M")
        base = 4.2 + (h + 6) * 0.075
        river_series.append(RiverPoint(t=t_str, level_m=round(base, 2), river_name="Adyar River (Saidapet)"))

    # Simulated Chennai Doppler rain time series (in mm and cm)
    rain_series = []
    for h in range(-6, 7):
        t_str = (now + timedelta(hours=h)).strftime("%H:%M")
        mm = max(5.0, 55.0 - abs(h) * 5.5)
        rain_series.append(RainPoint(t=t_str, mm=round(mm, 1), cm=round(mm / 10.0, 2)))

    zone_fc = []
    for z in zones:
        p = z.current_probability or 0.45
        zone_fc.append(ZoneForecast(
            zone_id=z.zone_id,
            name=z.name,
            risk_level=z.current_risk_category,
            probability=p,
            predicted_rain_cm=round(z.predicted_rain_cm or 18.0, 1),
            predicted_flood_depth_cm=round(z.predicted_flood_depth_cm or 42.0, 1),
            time_to_flood_hours=round(z.time_to_flood_hours or 2.5, 1),
            flooded_roads=z.flooded_roads or [],
            safe_corridors=z.safe_corridors or [],
            p_3h=round(min(0.99, max(0.05, p + 0.08)), 2),
            p_6h=round(min(0.99, max(0.05, p + 0.14)), 2),
            p_12h=round(min(0.99, max(0.05, p + 0.18)), 2),
            confidence=0.92
        ))

    return PublicForecast(
        river_series=river_series,
        rain_series=rain_series,
        zone_forecast=zone_fc,
        overall_predicted_rain_cm=22.5,
        overall_predicted_flood_cm=55.0
    )

@router.post("/assistant", response_model=AssistantResponse)
async def post_public_assistant(req: AssistantRequest, db: Session = Depends(get_db)):
    resp = await assistant_service.answer_public_question(db, req.question, req.lang, req.zone_id)
    return AssistantResponse(**resp)
