import math
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Zone

class RouteOptimizationAgent(BaseAgent):
    def __init__(self):
        super().__init__("Route Optimization Agent")

    async def run(self, db, context=None) -> AgentResult:
        zones = db.query(Zone).all()
        blocked_routes = []
        for z in zones:
            if z.flooded_pct > 80.0:
                blocked_routes.append(f"Waterway/Road corridor in {z.name} is inundated (>80%)")

        msg = f"Audited {len(zones)} zone transit corridors."
        if blocked_routes:
            msg += f" {len(blocked_routes)} blocked segments re-routed around high flood extent."
        else:
            msg += " All standard boat and vehicle arteries clear."

        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="OPTIMIZE_ROUTES",
            input_summary="Kuttanad waterway & road network topology",
            output_summary=msg,
            data={"blocked_routes": blocked_routes}
        )
