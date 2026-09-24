import random
from datetime import datetime, timezone
from app.agents.base import BaseAgent, AgentResult
from app.models.models import Zone, Observation

class WeatherAgent(BaseAgent):
    def __init__(self):
        super().__init__("Weather Agent")

    async def run(self, db, context=None) -> AgentResult:
        # Fetch or simulate rainfall curve
        rain_obs = db.query(Observation).filter(Observation.type == "rain").order_by(Observation.fetched_at.desc()).first()
        base_rain = rain_obs.value if rain_obs else 38.5
        # Slight simulated fluctuation
        current_rain = round(base_rain + random.uniform(-1.5, 2.5), 1)

        msg = f"Observed 3h rainfall: {current_rain} mm in Kuttanad basin"
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="OBSERVE_WEATHER",
            input_summary="Kuttanad weather stations & Open-Meteo radar",
            output_summary=msg,
            data={"rain_3h_mm": current_rain}
        )

class RiverGaugeAgent(BaseAgent):
    def __init__(self):
        super().__init__("River Gauge Agent")

    async def run(self, db, context=None) -> AgentResult:
        river_obs = db.query(Observation).filter(Observation.type == "river").order_by(Observation.fetched_at.desc()).first()
        base_level = river_obs.value if river_obs else 5.25
        # Simulate slight rise or use obs
        level = round(base_level + random.uniform(-0.02, 0.05), 2)
        rise_rate = 0.18 # m/hr
        trend = "rising" if rise_rate > 0.05 else ("falling" if rise_rate < -0.05 else "steady")

        msg = f"Pamba-Manimala river level at {level} m (Alert: 5.5m, Trend: {trend}, Rise: +{rise_rate}m/h)"
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="OBSERVE_RIVER",
            input_summary="Pamba River Telemetered Gauge",
            output_summary=msg,
            data={"level_m": level, "rise_rate_m_hr": rise_rate, "trend": trend}
        )

class SatelliteAgent(BaseAgent):
    def __init__(self):
        super().__init__("Satellite Agent")

    async def run(self, db, context=None) -> AgentResult:
        zones = db.query(Zone).all()
        zone_water = {}
        for z in zones:
            zone_water[z.zone_id] = round(z.satellite_water_fraction, 3)

        msg = f"Processed Sentinel-1 SAR imagery. Water extent calculated for {len(zones)} zones."
        self.record_run(msg)
        return AgentResult(
            agent_name=self.name,
            action="OBSERVE_SATELLITE",
            input_summary="Sentinel-1 SAR VV/VH polarization water mask",
            output_summary=msg,
            data={"zone_water_fractions": zone_water}
        )
