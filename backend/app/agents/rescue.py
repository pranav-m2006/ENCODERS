from datetime import datetime, timezone
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Zone, RescueResource, Approval, EvacuationGroup, Camp
from app.config import settings

class RescueCoordinationAgent(BaseAgent):
    def __init__(self):
        super().__init__("Rescue Coordination Agent")

    async def run(self, db, context=None) -> AgentResult:
        zones = db.query(Zone).all()
        rescue_units = db.query(RescueResource).all()
        camps = db.query(Camp).all()

        # Compute zone priority
        # priority = 0.45*risk + 0.30*demand + 0.15*vulnerability + 0.10*route_status
        zone_priorities = {}
        for z in zones:
            risk_val = z.current_probability
            demand_val = min(1.0, z.needing_evacuation / 2000.0)
            vuln_val = z.vulnerability_index
            route_val = 0.8 # Assume accessible
            p_score = 0.45 * risk_val + 0.30 * demand_val + 0.15 * vuln_val + 0.10 * route_val
            zone_priorities[z.zone_id] = round(p_score, 3)

        # Find urgent unassigned zones
        urgent_zones = sorted(zones, key=lambda z: zone_priorities.get(z.zone_id, 0.0), reverse=True)
        available_units = [u for u in rescue_units if u.status == "available"]

        dispatches = []
        for zone in urgent_zones:
            if zone.needing_evacuation > 0 and available_units:
                unit = available_units.pop(0)
                # Check if approval already exists
                existing_approval = db.query(Approval).filter(
                    Approval.type == "dispatch",
                    Approval.status == "pending"
                ).first()

                if not existing_approval:
                    reason = f"Zone {zone.name} has {zone.needing_evacuation} persons needing evacuation at {zone.current_risk_category} risk level."
                    app = Approval(
                        type="dispatch",
                        payload={"unit_id": unit.resource_id, "unit_name": unit.name, "zone_id": zone.zone_id, "zone_name": zone.name},
                        reason=reason,
                        confidence=0.92,
                        status="pending"
                    )
                    db.add(app)
                    dispatches.append(f"Recommended dispatch {unit.name} to {zone.name}")

        db.commit()

        msg = f"Evaluated rescue priorities across {len(zones)} zones. {len(dispatches)} dispatch proposals generated."
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="PLAN_RESCUE",
            input_summary=f"Zone demand & {len(rescue_units)} rescue units",
            output_summary=msg,
            data={"priorities": zone_priorities, "dispatches": dispatches}
        )
