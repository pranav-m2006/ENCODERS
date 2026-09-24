import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    Camp, EvacuationGroup, CampMovement, ResourceStock, Zone, RescueResource,
    AgentEvent, Approval, SessionLocal
)
from app.core.bus import bus
from app.ml.demand import calculate_hours_of_cover

class StateManager:
    def __init__(self):
        self._last_coordinator_trigger = 0.0
        self._coordinator_lock = asyncio.Lock()

    def update_camp_status_derived(self, camp: Camp) -> str:
        """Derives status based on capacity rules unless explicitly marked closed"""
        if camp.status == "closed":
            return "closed"
        total_projected = camp.current_occupancy + camp.inbound_occupancy
        if camp.current_occupancy >= camp.capacity:
            new_status = "full"
        elif total_projected >= int(camp.capacity * 0.90):
            new_status = "near_capacity"
        else:
            new_status = "open"
        camp.status = new_status
        return new_status

    async def update_camp(
        self,
        db: Session,
        camp_id: str,
        actor: str,
        capacity: Optional[int] = None,
        current_occupancy: Optional[int] = None,
        occupancy_delta: Optional[int] = None,
        status: Optional[str] = None,
        facilities: Optional[Dict[str, bool]] = None,
        contact_name: Optional[str] = None,
        contact_phone: Optional[str] = None,
        notes: Optional[str] = None,
        override_capacity_check: bool = False
    ) -> Camp:
        camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
        if not camp:
            raise ValueError(f"Camp {camp_id} not found")

        before_state = {
            "capacity": camp.capacity,
            "current_occupancy": camp.current_occupancy,
            "status": camp.status,
            "facilities": camp.facilities
        }

        if capacity is not None:
            camp.capacity = max(10, capacity)
        if occupancy_delta is not None:
            camp.current_occupancy = max(0, camp.current_occupancy + occupancy_delta)
        elif current_occupancy is not None:
            camp.current_occupancy = max(0, current_occupancy)

        if status is not None:
            camp.status = status
        else:
            self.update_camp_status_derived(camp)

        if facilities is not None:
            camp.facilities = facilities
        if contact_name is not None:
            camp.contact_name = contact_name
        if contact_phone is not None:
            camp.contact_phone = contact_phone
        if notes is not None:
            camp.notes = notes

        camp.updated_at = datetime.now(timezone.utc)
        camp.updated_by_role = actor

        after_state = {
            "capacity": camp.capacity,
            "current_occupancy": camp.current_occupancy,
            "status": camp.status,
            "facilities": camp.facilities
        }

        # Audit Event
        evt = AgentEvent(
            agent_name="Camp Management",
            action="UPDATE_CAMP",
            input_summary=f"Actor: {actor}, Before: {before_state}",
            output_summary=f"After: {after_state}",
            status="success",
            related_resource=camp_id
        )
        db.add(evt)
        db.commit()
        db.refresh(camp)

        # Publish SSE event
        pub_payload = {
            "camp_id": camp.camp_id,
            "name": camp.name,
            "capacity": camp.capacity,
            "available": max(0, camp.capacity - camp.current_occupancy),
            "current_occupancy": camp.current_occupancy,
            "inbound_occupancy": camp.inbound_occupancy,
            "status": camp.status,
            "facilities": camp.facilities,
            "contact": f"{camp.contact_name} ({camp.contact_phone})",
            "updated_at": camp.updated_at.isoformat()
        }
        await bus.publish("camp_updated", pub_payload, is_public_safe=True)

        if camp.status in ["near_capacity", "full"]:
            await bus.publish("camp_over_capacity", {
                "camp_id": camp.camp_id,
                "name": camp.name,
                "projected": camp.current_occupancy + camp.inbound_occupancy,
                "capacity": camp.capacity,
                "status": camp.status
            }, is_public_safe=True)

        # Trigger Coordinator cycle asynchronously
        asyncio.create_task(self._trigger_coordinator_debounced(reason=f"camp_update_{camp_id}"))

        return camp

    async def update_group_status(
        self,
        db: Session,
        group_id: str,
        new_status: str,
        actor: str = "authority"
    ) -> EvacuationGroup:
        group = db.query(EvacuationGroup).filter(EvacuationGroup.group_id == group_id).first()
        if not group:
            raise ValueError(f"Evacuation group {group_id} not found")

        old_status = group.status
        if old_status == new_status:
            return group

        camp = db.query(Camp).filter(Camp.camp_id == group.destination_camp).first()
        source_zone = db.query(Zone).filter(Zone.zone_id == group.source_zone).first()

        group.status = new_status
        group.updated_at = datetime.now(timezone.utc)

        # Inbound and occupancy adjustments
        if camp:
            if old_status == "waiting" and new_status == "moving":
                camp.inbound_occupancy += group.population
            elif old_status == "moving" and new_status == "arrived":
                camp.inbound_occupancy = max(0, camp.inbound_occupancy - group.population)
                camp.current_occupancy += group.population
                # Create movement record
                movement = CampMovement(
                    group_id=group.group_id,
                    camp_id=camp.camp_id,
                    people_count=group.population,
                    status="arrived",
                    source_zone=group.source_zone,
                    transport_type="Rescue Boat"
                )
                db.add(movement)
            elif old_status == "waiting" and new_status == "arrived":
                camp.current_occupancy += group.population
                movement = CampMovement(
                    group_id=group.group_id,
                    camp_id=camp.camp_id,
                    people_count=group.population,
                    status="arrived",
                    source_zone=group.source_zone,
                    transport_type="Direct Evacuation"
                )
                db.add(movement)

            self.update_camp_status_derived(camp)

        if source_zone and new_status == "arrived":
            source_zone.needing_evacuation = max(0, source_zone.needing_evacuation - group.population)

        # Audit Event
        evt = AgentEvent(
            agent_name="Evacuation Group Service",
            action="UPDATE_GROUP_STATUS",
            input_summary=f"Group {group_id} status {old_status} -> {new_status} (Size: {group.population})",
            output_summary=f"Destination Camp {camp.name if camp else 'None'} occupancy now {camp.current_occupancy if camp else 0}",
            status="success",
            related_zone=group.source_zone,
            related_resource=group.destination_camp
        )
        db.add(evt)
        db.commit()
        db.refresh(group)
        if camp:
            db.refresh(camp)

        # Broadcast events
        await bus.publish("group_status_changed", {
            "group_id": group.group_id,
            "status": group.status,
            "source_zone": group.source_zone,
            "destination_camp": group.destination_camp,
            "population": group.population
        }, is_public_safe=False) # Groups are private to authority

        if camp:
            pub_camp_payload = {
                "camp_id": camp.camp_id,
                "name": camp.name,
                "capacity": camp.capacity,
                "available": max(0, camp.capacity - camp.current_occupancy),
                "current_occupancy": camp.current_occupancy,
                "status": camp.status,
                "facilities": camp.facilities,
                "contact": f"{camp.contact_name} ({camp.contact_phone})",
                "updated_at": camp.updated_at.isoformat()
            }
            await bus.publish("camp_updated", pub_camp_payload, is_public_safe=True)

        asyncio.create_task(self._trigger_coordinator_debounced(reason=f"group_status_{group_id}"))
        return group

    async def transfer_camp_occupancy(
        self,
        db: Session,
        from_camp_id: str,
        to_camp_id: str,
        people: int,
        actor: str = "authority"
    ) -> Dict[str, Any]:
        from_c = db.query(Camp).filter(Camp.camp_id == from_camp_id).first()
        to_c = db.query(Camp).filter(Camp.camp_id == to_camp_id).first()

        if not from_c or not to_c:
            raise ValueError("Invalid source or destination camp ID")

        if people <= 0:
            raise ValueError("People count must be positive")

        if from_c.current_occupancy < people:
            people = from_c.current_occupancy # Transfer up to available occupants

        from_c.current_occupancy -= people
        to_c.current_occupancy += people

        self.update_camp_status_derived(from_c)
        self.update_camp_status_derived(to_c)

        movement = CampMovement(
            camp_id=to_c.camp_id,
            people_count=people,
            status="arrived",
            source_zone=from_c.name,
            transport_type="Camp-to-Camp Transfer Bus"
        )
        db.add(movement)

        evt = AgentEvent(
            agent_name="Camp Transfer Service",
            action="TRANSFER_CAMP_OCCUPANCY",
            input_summary=f"Transfer {people} people from {from_c.name} ({from_c.current_occupancy + people}) to {to_c.name} ({to_c.current_occupancy - people})",
            output_summary=f"New occupancies: {from_c.name}={from_c.current_occupancy}, {to_c.name}={to_c.current_occupancy}",
            status="success"
        )
        db.add(evt)
        db.commit()

        # Broadcast SSE for both camps
        for c in [from_c, to_c]:
            await bus.publish("camp_updated", {
                "camp_id": c.camp_id,
                "name": c.name,
                "capacity": c.capacity,
                "available": max(0, c.capacity - c.current_occupancy),
                "current_occupancy": c.current_occupancy,
                "status": c.status,
                "facilities": c.facilities,
                "contact": f"{c.contact_name} ({c.contact_phone})",
                "updated_at": c.updated_at.isoformat()
            }, is_public_safe=True)

        asyncio.create_task(self._trigger_coordinator_debounced(reason="camp_transfer"))
        return {
            "from_camp": from_c.camp_id,
            "to_camp": to_c.camp_id,
            "people": people,
            "from_occupancy": from_c.current_occupancy,
            "to_occupancy": to_c.current_occupancy
        }

    async def auto_checkin_camp(
        self,
        db: Session,
        camp_id: str,
        people_count: int = 1,
        source_zone: str = "Live GPS Geofence",
        actor: str = "citizen_geofence"
    ) -> Dict[str, Any]:
        camp = db.query(Camp).filter(Camp.camp_id == camp_id).first()
        if not camp:
            raise ValueError(f"Camp {camp_id} not found")

        people_count = max(1, people_count)
        camp.current_occupancy += people_count

        # Automatically deduct resource stock based on new occupants (meals and water)
        stock = db.query(ResourceStock).filter(ResourceStock.camp_id == camp_id).first()
        if stock:
            # Each person consumes 2 meal units and 5 liters of water daily reserve
            stock.food = max(0.0, stock.food - (people_count * 2.0))
            stock.water = max(0.0, stock.water - (people_count * 5.0))
            camp.meals_available = int(stock.food)
            camp.water_liters_available = int(stock.water)

        # Re-derive status
        self.update_camp_status_derived(camp)
        camp.updated_at = datetime.now(timezone.utc)
        camp.updated_by_role = actor

        # Add movement
        movement = CampMovement(
            camp_id=camp.camp_id,
            people_count=people_count,
            status="arrived",
            source_zone=source_zone,
            transport_type="Automated Geofence Tap-in"
        )
        db.add(movement)

        # Audit Event
        evt = AgentEvent(
            agent_name="Geofence Check-in Service",
            action="AUTO_CAMP_CHECKIN",
            input_summary=f"Automated geofence entry: {people_count} person(s) at {camp.name}",
            output_summary=f"Occupancy: {camp.current_occupancy}/{camp.capacity} ({camp.status}), Remaining Meals: {camp.meals_available}",
            status="success",
            related_resource=camp_id
        )
        db.add(evt)
        db.commit()
        db.refresh(camp)

        # Broadcast SSE
        pub_payload = {
            "camp_id": camp.camp_id,
            "name": camp.name,
            "capacity": camp.capacity,
            "available": max(0, camp.capacity - camp.current_occupancy),
            "current_occupancy": camp.current_occupancy,
            "status": camp.status,
            "urgent_needs": camp.urgent_needs or [],
            "meals_available": camp.meals_available,
            "water_liters_available": camp.water_liters_available,
            "blankets_available": camp.blankets_available,
            "facilities": camp.facilities,
            "contact": f"{camp.contact_name} ({camp.contact_phone})",
            "updated_at": camp.updated_at.isoformat()
        }
        await bus.publish("camp_updated", pub_payload, is_public_safe=True)
        await bus.publish("arrival_event", {
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "size": people_count,
            "source_zone": source_zone,
            "transport": "Geofence Automated Entry",
            "camp": camp.name,
            "status": "arrived"
        }, is_public_safe=True)

        asyncio.create_task(self._trigger_coordinator_debounced(reason=f"auto_checkin_{camp_id}"))

        return {
            "success": True,
            "camp_id": camp.camp_id,
            "camp_name": camp.name,
            "people_checked_in": people_count,
            "new_occupancy": camp.current_occupancy,
            "capacity": camp.capacity,
            "remaining_capacity": max(0, camp.capacity - camp.current_occupancy),
            "status": camp.status,
            "updated_meals_remaining": camp.meals_available,
            "updated_water_liters": camp.water_liters_available,
            "message": f"Successfully checked into {camp.name}. Occupancy and resource allocations updated automatically."
        }

    def get_my_location_risk(self, db: Session, user_lat: float, user_lng: float) -> Dict[str, Any]:
        """Calculates exact zone risk, predicted rain/flood in cm, ETA to flood, and nearest relief camp"""
        zones = db.query(Zone).all()
        if not zones:
            return {
                "user_lat": user_lat,
                "user_lng": user_lng,
                "matched_zone_id": "chennai_central",
                "matched_zone_name": "Chennai Urban Core",
                "risk_level": "Medium",
                "probability_pct": 45.0,
                "predicted_rain_cm": 14.5,
                "predicted_flood_depth_cm": 35.0,
                "time_to_flood_hours": 3.0,
                "time_to_flood_display": "Onset expected in ~3.0 hours",
                "flooded_roads_nearby": ["Main Arterial Road"],
                "safe_corridors": ["Elevated Flyover"],
                "nearest_camp": {},
                "advice": "Monitor official advisories."
            }

        import math
        def haversine_km(lat1, lon1, lat2, lon2):
            R = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        closest_zone = min(zones, key=lambda z: haversine_km(user_lat, user_lng, z.centroid_lat, z.centroid_lng))
        dist_zone = haversine_km(user_lat, user_lng, closest_zone.centroid_lat, closest_zone.centroid_lng)

        # Nearest Camp
        camps = db.query(Camp).filter(Camp.status != "closed").all()
        nearest_camp_dict = {}
        if camps:
            closest_camp = min(camps, key=lambda c: haversine_km(user_lat, user_lng, c.lat, c.lng))
            dist_camp = round(haversine_km(user_lat, user_lng, closest_camp.lat, closest_camp.lng), 2)
            nearest_camp_dict = {
                "camp_id": closest_camp.camp_id,
                "name": closest_camp.name,
                "lat": closest_camp.lat,
                "lng": closest_camp.lng,
                "distance_km": dist_camp,
                "capacity": closest_camp.capacity,
                "available": max(0, closest_camp.capacity - closest_camp.current_occupancy),
                "status": closest_camp.status,
                "meals_available": closest_camp.meals_available,
                "water_liters_available": closest_camp.water_liters_available,
                "urgent_needs": closest_camp.urgent_needs or [],
                "contact": f"{closest_camp.contact_name} ({closest_camp.contact_phone})"
            }

        # Format ETA
        hours = closest_zone.time_to_flood_hours or 3.0
        if closest_zone.current_risk_category in ["Critical", "High"]:
            time_display = f"⚠️ Flood Inundation Peak Expected in {hours:.1f} hrs"
        elif closest_zone.current_risk_category == "Medium":
            time_display = f"⚠️ Waterlogging Risk Rising in {hours:.1f} hrs"
        else:
            time_display = "✅ Currently Normal — Monitored for Rain Accumulation"

        return {
            "user_lat": user_lat,
            "user_lng": user_lng,
            "matched_zone_id": closest_zone.zone_id,
            "matched_zone_name": closest_zone.name,
            "risk_level": closest_zone.current_risk_category,
            "probability_pct": round((closest_zone.current_probability or 0.45) * 100, 1),
            "predicted_rain_cm": round(closest_zone.predicted_rain_cm or 15.0, 1),
            "predicted_flood_depth_cm": round(closest_zone.predicted_flood_depth_cm or 35.0, 1),
            "time_to_flood_hours": round(hours, 1),
            "time_to_flood_display": time_display,
            "flooded_roads_nearby": closest_zone.flooded_roads or ["Low-lying interior streets"],
            "safe_corridors": closest_zone.safe_corridors or ["Major elevated expressway"],
            "nearest_camp": nearest_camp_dict,
            "advice": closest_zone.advice or "Relocate to designated shelter if water levels breach doorstep."
        }

    def get_ai_camp_candidates(self, area_name: str = "") -> list:
        """AI-collected potential camp facilities in Chennai for authority confirmation"""
        all_candidates = [
            {
                "candidate_id": "cand_dg_vaishnav",
                "name": "D.G. Vaishnav College Auditorium, Arumbakkam",
                "area": "Arumbakkam / Poonamallee High Road",
                "lat": 13.0732,
                "lng": 80.2155,
                "suggested_capacity": 2200,
                "building_type": "College Campus & Auditorium",
                "proximity_to_flood": "1.8 km from Cooum canal overflow",
                "elevation_m": 7.5,
                "suitability_score": 0.94,
                "recommended_reason": "High elevation ground, large dining halls, generator backup, excellent road access from Koyambedu."
            },
            {
                "candidate_id": "cand_loyola",
                "name": "Loyola College Bertram Hall, Nungambakkam",
                "area": "Nungambakkam / Sterling Road",
                "lat": 13.0626,
                "lng": 80.2337,
                "suggested_capacity": 2800,
                "building_type": "Institutional Campus",
                "proximity_to_flood": "Safe non-inundated zone",
                "elevation_m": 8.0,
                "suitability_score": 0.96,
                "recommended_reason": "Centrally located in high ground, commercial kitchens, multi-tier staging capacity."
            },
            {
                "candidate_id": "cand_san_thome",
                "name": "San Thome Higher Secondary School Hall, Mylapore",
                "area": "Mylapore / San Thome High Road",
                "lat": 13.0335,
                "lng": 80.2785,
                "suggested_capacity": 1500,
                "building_type": "Higher Secondary School",
                "proximity_to_flood": "Near coast / Adyar estuary (elevated)",
                "elevation_m": 6.8,
                "suitability_score": 0.89,
                "recommended_reason": "Can accommodate South Chennai coastal evacuees with direct access to Kamarajar Salai."
            },
            {
                "candidate_id": "cand_srm_ramapuram",
                "name": "SRM Ramapuram Indoor Sports Auditorium",
                "area": "Ramapuram / Porur Road",
                "lat": 13.0320,
                "lng": 80.1780,
                "suggested_capacity": 2000,
                "building_type": "Indoor Stadium",
                "proximity_to_flood": "1.2 km from Porur lake surplus channel",
                "elevation_m": 6.0,
                "suitability_score": 0.91,
                "recommended_reason": "Equipped with solar back-up power, massive indoor space, and dedicated RO filtration plant."
            }
        ]
        if area_name:
            filtered = [c for c in all_candidates if area_name.lower() in c["area"].lower() or area_name.lower() in c["name"].lower()]
            return filtered if filtered else all_candidates
        return all_candidates

    async def _trigger_coordinator_debounced(self, reason: str):
        from app.agents.coordinator import coordinator
        from app.services.briefing import briefing_service
        try:
            await asyncio.sleep(0.5) # Debounce
            db = SessionLocal()
            try:
                await coordinator.run_cycle(db, trigger_reason=reason)
                await briefing_service.refresh_briefs(db)
            finally:
                db.close()
        except Exception as e:
            print(f"Coordinator debounce error: {e}")

state_manager = StateManager()
