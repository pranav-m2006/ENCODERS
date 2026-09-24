import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.agents.base import BaseAgent, AgentResult
from app.agents.weather import WeatherAgent, RiverGaugeAgent, SatelliteAgent
from app.agents.fusion import DataFusionAgent
from app.agents.prediction import FloodPredictionAgent
from app.agents.rescue import RescueCoordinationAgent
from app.agents.route import RouteOptimizationAgent
from app.agents.camp import ReliefCampAgent
from app.agents.resource import ResourceAgent
from app.models.models import AgentEvent, SessionLocal
from app.core.bus import bus

class CoordinatorAgent(BaseAgent):
    def __init__(self):
        super().__init__("Coordinator Agent")
        self.weather_agent = WeatherAgent()
        self.river_agent = RiverGaugeAgent()
        self.satellite_agent = SatelliteAgent()
        self.fusion_agent = DataFusionAgent()
        self.prediction_agent = FloodPredictionAgent()
        self.rescue_agent = RescueCoordinationAgent()
        self.route_agent = RouteOptimizationAgent()
        self.camp_agent = ReliefCampAgent()
        self.resource_agent = ResourceAgent()

        self.current_stage = "MONITOR"
        self.current_stage_message = "System monitoring live telemetry feeds"
        self.current_cycle_id = f"cycle_{uuid.uuid4().hex[:8]}"
        self.last_cycle_time = datetime.now(timezone.utc)
        self.cycle_count = 0

    def get_all_agents(self) -> List[BaseAgent]:
        return [
            self.satellite_agent,
            self.river_agent,
            self.weather_agent,
            self.fusion_agent,
            self.prediction_agent,
            self.rescue_agent,
            self.route_agent,
            self.camp_agent,
            self.resource_agent,
            self
        ]

    async def _set_stage(self, stage: str, message: str, db):
        self.current_stage = stage
        self.current_stage_message = message
        now_str = datetime.now(timezone.utc).isoformat()
        payload = {
            "stage": stage,
            "message": message,
            "cycle_id": self.current_cycle_id,
            "timestamp": now_str
        }

        # Log event in database
        evt = AgentEvent(
            agent_name="Coordinator Agent",
            action=f"STAGE_{stage}",
            input_summary=f"Cycle {self.current_cycle_id}",
            output_summary=message,
            status="success"
        )
        db.add(evt)
        db.commit()

        # Publish SSE event
        await bus.publish("loop_stage", payload, is_public_safe=True)

    async def run_cycle(self, db, trigger_reason: str = "scheduled_tick") -> Dict[str, Any]:
        self.cycle_count += 1
        self.current_cycle_id = f"cycle_{uuid.uuid4().hex[:8]}"
        self.last_cycle_time = datetime.now(timezone.utc)

        # 1. OBSERVE
        await self._set_stage("OBSERVE", f"OBSERVE: Polling weather radar, river gauge, and Sentinel-1 SAR ({trigger_reason})", db)
        w_res = await self.weather_agent.run(db)
        r_res = await self.river_agent.run(db)
        s_res = await self.satellite_agent.run(db)

        # 2. ANALYZE
        await self._set_stage("ANALYZE", "ANALYZE: Fusing hydrological telemetry and running ML flood risk classifier", db)
        fusion_ctx = {
            "rain_3h_mm": w_res.data.get("rain_3h_mm", 40.0),
            "level_m": r_res.data.get("level_m", 5.2),
            "rise_rate_m_hr": r_res.data.get("rise_rate_m_hr", 0.15)
        }
        f_res = await self.fusion_agent.run(db, fusion_ctx)
        p_res = await self.prediction_agent.run(db, f_res.data)

        # 3. PLAN
        await self._set_stage("PLAN", "PLAN: Optimizing boat dispatches, checking route safety and camp capacity", db)
        resc_res = await self.rescue_agent.run(db)
        rout_res = await self.route_agent.run(db)
        camp_res = await self.camp_agent.run(db)
        res_res = await self.resource_agent.run(db)

        # 4. ACT
        await self._set_stage("ACT", "ACT: Updating shared state, syncing approvals, and dispatching alerts", db)

        # 5. MONITOR
        await self._set_stage("MONITOR", "MONITOR: Continuous stream active. Awaiting new telemetry or authority edits.", db)

        # 6. RE-PLAN check
        cat_shifts = p_res.data.get("category_changes", [])
        if cat_shifts:
            await self._set_stage("RE-PLAN", f"RE-PLAN: Triggered by zone category shift: {', '.join(cat_shifts[:2])}", db)

        self.record_run(f"Completed cycle {self.current_cycle_id} ({trigger_reason})")

        return {
            "cycle_id": self.current_cycle_id,
            "status": "completed",
            "trigger": trigger_reason,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

coordinator = CoordinatorAgent()
