from datetime import datetime, timezone
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Camp, EvacuationGroup, Approval, Zone

class ReliefCampAgent(BaseAgent):
    def __init__(self):
        super().__init__("Relief Camp Agent")

    async def run(self, db, context=None) -> AgentResult:
        camps = db.query(Camp).all()
        groups = db.query(EvacuationGroup).filter(EvacuationGroup.status != "arrived").all()

        camp_dict = {c.camp_id: c for c in camps}
        warnings = []
        recommendations = []

        # Check for near-capacity or overflowing camps
        for c in camps:
            projected = c.current_occupancy + c.inbound_occupancy
            projected_pct = (projected / c.capacity) * 100.0 if c.capacity > 0 else 100.0

            if projected_pct >= 90.0:
                warnings.append(f"{c.name} is near/over capacity: projected {projected}/{c.capacity} ({round(projected_pct, 1)}%)")

                # Find a feasible alternative camp with free space
                alt_camps = sorted(
                    [ac for ac in camps if ac.camp_id != c.camp_id and (ac.capacity - (ac.current_occupancy + ac.inbound_occupancy)) > 150],
                    key=lambda ac: (ac.capacity - (ac.current_occupancy + ac.inbound_occupancy)),
                    reverse=True
                )

                if alt_camps:
                    best_alt = alt_camps[0]
                    free_in_alt = best_alt.capacity - (best_alt.current_occupancy + best_alt.inbound_occupancy)

                    # Check if pending approval already exists for this camp
                    existing_app = db.query(Approval).filter(
                        Approval.type.in_(["camp_redirect", "transfer"]),
                        Approval.status == "pending"
                    ).first()

                    if not existing_app:
                        excess = max(100, projected - int(c.capacity * 0.85))
                        app = Approval(
                            type="camp_redirect",
                            payload={
                                "from_camp_id": c.camp_id,
                                "from_camp_name": c.name,
                                "to_camp_id": best_alt.camp_id,
                                "to_camp_name": best_alt.name,
                                "people": excess,
                                "from_before": projected,
                                "from_capacity": c.capacity,
                                "to_free": free_in_alt
                            },
                            reason=f"{c.name} projected {projected}/{c.capacity}. Recommend diverting/transferring {excess} people to {best_alt.name} ({free_in_alt} free seats).",
                            confidence=0.94,
                            status="pending"
                        )
                        db.add(app)
                        recommendations.append(f"Redirect recommendation created for {c.name} -> {best_alt.name}")

        db.commit()

        msg = f"Audited capacity across {len(camps)} relief camps. {len(warnings)} capacity alerts identified."
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="CHECK_CAMP_CAPACITY",
            input_summary=f"{len(camps)} relief camps & {len(groups)} en-route groups",
            output_summary=msg,
            data={"warnings": warnings, "recommendations": recommendations}
        )
