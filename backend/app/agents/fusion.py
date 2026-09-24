from datetime import datetime, timezone
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Zone
from app.ml.features import extract_features

class DataFusionAgent(BaseAgent):
    def __init__(self):
        super().__init__("Data Fusion Agent")

    async def run(self, db, context=None) -> AgentResult:
        context = context or {}
        rain = context.get("rain_3h_mm", 40.0)
        river = context.get("level_m", 5.2)
        rise_rate = context.get("rise_rate_m_hr", 0.15)

        zones = db.query(Zone).all()
        fused_features = {}
        for z in zones:
            fused_features[z.zone_id] = extract_features(
                rain_3h_mm=rain,
                river_level_m=river,
                river_rise_rate_m_hr=rise_rate,
                low_lying_index=z.low_lying_index,
                river_proximity_km=z.river_proximity,
                satellite_water_fraction=z.satellite_water_fraction,
                elevation_m=z.elevation
            )

        msg = f"Fused multi-source hydrological & SAR telemetry across {len(zones)} administrative zones."
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="FUSE_DATA",
            input_summary="Weather, Gauge, Satellite feeds & GIS Basemaps",
            output_summary=msg,
            data={"fused_features": fused_features}
        )
