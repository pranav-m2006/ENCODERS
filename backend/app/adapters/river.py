"""
River gauge adapter chain: Live -> Cached -> Manual -> Simulated
"""
from datetime import datetime, timezone
from typing import Dict, Any, List

class RiverAdapter:
    def __init__(self):
        self.gauges = {
            "GAUGE-1": {"name": "Baran Upstream Dam", "stage_m": 8.6, "rate_of_rise": 0.35, "danger_level": 9.0},
            "GAUGE-2": {"name": "Midstream Bridge", "stage_m": 7.8, "rate_of_rise": 0.25, "danger_level": 8.5},
            "GAUGE-3": {"name": "Delta Confluence", "stage_m": 5.4, "rate_of_rise": 0.15, "danger_level": 6.8}
        }

    async def get_river_readings(self) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        res = []
        for g_id, g in self.gauges.items():
            res.append({
                "gauge_id": g_id,
                "name": g["name"],
                "stage_m": g["stage_m"],
                "rate_of_rise_m_h": g["rate_of_rise"],
                "danger_level_m": g["danger_level"],
                "status": "CRITICAL" if g["stage_m"] >= g["danger_level"] else ("WARNING" if g["stage_m"] >= g["danger_level"] - 1.0 else "NORMAL"),
                "as_of": now.isoformat()
            })
        return res

    def set_stage(self, gauge_id: str, stage_m: float, rate_of_rise: float):
        if gauge_id in self.gauges:
            self.gauges[gauge_id]["stage_m"] = stage_m
            self.gauges[gauge_id]["rate_of_rise"] = rate_of_rise

river_adapter = RiverAdapter()
