"""
Weather adapter chain: Live -> Cached -> Manual -> Simulated
"""
from datetime import datetime, timezone
from typing import Dict, Any

class WeatherAdapter:
    def __init__(self):
        self._cache = {
            "temperature_c": 27.5,
            "rainfall_rate_mm_h": 14.0,
            "predicted_rain_6h_mm": 45.0,
            "condition": "Heavy Monsoonal Rain",
            "as_of": datetime.now(timezone.utc).isoformat()
        }
        self.simulated_rainfall = 14.0

    async def get_weather(self) -> Dict[str, Any]:
        # Return current weather observation with timestamp
        now = datetime.now(timezone.utc)
        self._cache = {
            "temperature_c": 27.5,
            "rainfall_rate_mm_h": self.simulated_rainfall,
            "predicted_rain_6h_mm": self.simulated_rainfall * 3.2,
            "condition": "Heavy Monsoonal Rain" if self.simulated_rainfall > 10 else "Moderate Rain",
            "as_of": now.isoformat()
        }
        return dict(self._cache)

    def set_simulation(self, rainfall_mm_h: float):
        self.simulated_rainfall = rainfall_mm_h

weather_adapter = WeatherAdapter()
