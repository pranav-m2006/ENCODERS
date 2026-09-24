from datetime import datetime, timezone
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Camp, ResourceStock, SupplyRequest, Approval
from app.ml.demand import calculate_hours_of_cover

class ResourceAgent(BaseAgent):
    def __init__(self):
        super().__init__("Resource Agent")

    async def run(self, db, context=None) -> AgentResult:
        camps = db.query(Camp).all()
        shortages = []
        supply_reqs_created = 0

        for c in camps:
            stock = db.query(ResourceStock).filter(ResourceStock.camp_id == c.camp_id).first()
            if not stock:
                continue

            stock_dict = {
                "food": stock.food,
                "water": stock.water,
                "medicine": stock.medicine,
                "beds": stock.beds,
                "fuel": stock.fuel
            }
            analysis = calculate_hours_of_cover(stock_dict, c.current_occupancy)

            if analysis["is_shortage"]:
                shortages.extend([f"{c.name}: {s}" for s in analysis["shortages"]])

                # Propose supply request if not already existing
                existing_req = db.query(SupplyRequest).filter(
                    SupplyRequest.camp_id == c.camp_id,
                    SupplyRequest.status == "pending"
                ).first()

                if not existing_req and analysis["min_hours_of_cover"] < 12.0:
                    req = SupplyRequest(
                        camp_id=c.camp_id,
                        item="water" if analysis["hours_of_cover"]["water"] < 12.0 else "food",
                        quantity=2500.0,
                        status="pending",
                        created_by="Resource Agent"
                    )
                    db.add(req)
                    supply_reqs_created += 1

        db.commit()

        msg = f"Audited life-support supplies for {len(camps)} camps. {len(shortages)} critical inventory alerts."
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="AUDIT_RESOURCES",
            input_summary=f"Inventory for {len(camps)} camps",
            output_summary=msg,
            data={"shortages": shortages, "supply_requests_created": supply_reqs_created}
        )
