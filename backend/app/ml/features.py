from typing import Dict, Any

def extract_features(
    rain_3h_mm: float,
    river_level_m: float,
    river_rise_rate_m_hr: float,
    low_lying_index: float,
    river_proximity_km: float,
    satellite_water_fraction: float,
    elevation_m: float
) -> Dict[str, float]:
    return {
        "rain_3h_mm": float(rain_3h_mm),
        "river_level_m": float(river_level_m),
        "river_rise_rate_m_hr": float(river_rise_rate_m_hr),
        "low_lying_index": float(low_lying_index),
        "river_proximity_km": float(river_proximity_km),
        "satellite_water_fraction": float(satellite_water_fraction),
        "elevation_m": float(elevation_m)
    }
