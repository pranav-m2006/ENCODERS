import math
from typing import Dict, Any, Tuple, List

def predict_risk(features: Dict[str, float], population: int = 1000) -> Dict[str, Any]:
    """
    Computes calibrated flood probability, category, future forecasts and feature contributions.
    Features:
    - rain_3h_mm
    - river_level_m
    - river_rise_rate_m_hr
    - low_lying_index (0-1)
    - river_proximity_km
    - satellite_water_fraction (0-1)
    - elevation_m
    """
    rain = features.get("rain_3h_mm", 0.0)
    river = features.get("river_level_m", 4.0)
    rise_rate = features.get("river_rise_rate_m_hr", 0.1)
    low_lying = features.get("low_lying_index", 0.5)
    prox = features.get("river_proximity_km", 0.5)
    sat_water = features.get("satellite_water_fraction", 0.1)
    elev = features.get("elevation_m", 1.0)

    # Base weighted logit
    w_rain = min(rain / 80.0, 1.5) * 0.28
    w_river = max(0.0, (river - 4.5) / 2.0) * 0.35
    w_rise = max(0.0, rise_rate * 2.0) * 0.12
    w_low = low_lying * 0.15
    w_prox = max(0.0, (2.0 - prox) / 2.0) * 0.10
    w_sat = sat_water * 0.30
    w_elev = max(0.0, (3.0 - elev) / 3.0) * 0.10

    raw_score = (w_rain + w_river + w_rise + w_low + w_prox + w_sat + w_elev)
    prob = 1.0 / (1.0 + math.exp(-3.5 * (raw_score - 0.55)))
    prob = round(max(0.02, min(0.98, prob)), 3)

    # Risk Category
    if prob > 0.75:
        category = "Critical"
    elif prob > 0.50:
        category = "High"
    elif prob > 0.30:
        category = "Medium"
    else:
        category = "Low"

    # 3h, 6h, 12h projections
    p_3h = round(min(0.99, max(0.01, prob + rise_rate * 0.25 + (0.05 if rain > 30 else -0.02))), 2)
    p_6h = round(min(0.99, max(0.01, p_3h + rise_rate * 0.35 + (0.08 if rain > 50 else -0.04))), 2)
    p_12h = round(min(0.99, max(0.01, p_6h + (0.04 if river > 5.5 else -0.08))), 2)

    confidence = round(0.85 + (0.08 if sat_water > 0.05 else 0.0) - (0.05 if rain > 80 else 0.0), 2)
    expected_affected = int(population * prob * (0.6 + 0.4 * low_lying))

    # Feature contributions for explanation
    contributions = [
        {"name": "River Level", "value": round(river, 2), "contribution": round(w_river, 3)},
        {"name": "Rainfall (3h)", "value": round(rain, 1), "contribution": round(w_rain, 3)},
        {"name": "Satellite Water Extent", "value": round(sat_water, 3), "contribution": round(w_sat, 3)},
        {"name": "Low Lying Index", "value": round(low_lying, 2), "contribution": round(w_low, 3)},
        {"name": "River Rise Rate", "value": round(rise_rate, 2), "contribution": round(w_rise, 3)},
        {"name": "River Proximity", "value": round(prox, 2), "contribution": round(w_prox, 3)},
        {"name": "Elevation", "value": round(elev, 1), "contribution": round(w_elev, 3)}
    ]
    # Sort by contribution descending
    contributions.sort(key=lambda x: x["contribution"], reverse=True)

    return {
        "probability": prob,
        "category": category,
        "p_3h": p_3h,
        "p_6h": p_6h,
        "p_12h": p_12h,
        "confidence": confidence,
        "expected_affected": expected_affected,
        "features": features,
        "contributions": contributions
    }
