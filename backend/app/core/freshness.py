"""
Freshness and Data Envelope calculations for FloodOps.
Computes data status dynamically on read. Status is NEVER trusted from writer.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

# Default freshness thresholds in seconds (Contract A2)
DEFAULT_FRESHNESS_THRESHOLDS = {
    "river_gauge": 1800,           # 30 min
    "weather_observation": 3600,   # 1 hour
    "weather_forecast": 21600,     # 6 hours
    "satellite_pass": 86400,       # 24 hours
    "satellite_extent": 86400,     # 24 hours
    "camp_occupancy": 10800,       # 3 hours
    "road_report": 21600,          # 6 hours
    "evacuation_group": 7200,      # 2 hours (LOST_CONTACT at 6 h / 21600s)
}

def parse_iso_datetime(dt_val: Any) -> datetime:
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    if isinstance(dt_val, str):
        cleaned = dt_val.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(cleaned)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    return datetime.now(timezone.utc)

def compute_status(
    source_type: str,
    as_of: Any,
    now: Optional[datetime] = None,
    thresholds: Optional[Dict[str, int]] = None
) -> str:
    """
    Computes data status: LIVE | STALE | FIELD_REPORT | ESTIMATED | UNAVAILABLE | LOST_CONTACT
    """
    if as_of is None:
        return "UNAVAILABLE"
    
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    
    as_of_dt = parse_iso_datetime(as_of)
    age_seconds = (current_time - as_of_dt).total_seconds()
    if age_seconds < 0:
        age_seconds = 0

    thresh = (thresholds or DEFAULT_FRESHNESS_THRESHOLDS).get(source_type, 3600)

    if source_type == "evacuation_group":
        if age_seconds > 21600: # 6 hours
            return "LOST_CONTACT"
        elif age_seconds > thresh:
            return "STALE"
        return "LIVE"

    if age_seconds <= thresh:
        return "LIVE"
    return "STALE"

def compute_effective_road_status(
    raw_status: str,
    as_of: Any,
    now: Optional[datetime] = None,
    threshold_seconds: int = 21600 # 6 hours
) -> str:
    """
    Contract A2: Fail-safe asymmetry for roads:
    - Stale + BLOCKED stays BLOCKED.
    - Stale + SAFE degrades to CAUTION.
    - Fresh report uses raw_status.
    """
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    
    as_of_dt = parse_iso_datetime(as_of) if as_of else None
    if not as_of_dt:
        return "UNKNOWN"
    
    age_seconds = (current_time - as_of_dt).total_seconds()
    is_stale = age_seconds > threshold_seconds

    if not is_stale:
        return raw_status.upper()

    # Stale fail-safe rules
    upper = raw_status.upper()
    if upper == "BLOCKED":
        return "BLOCKED"
    if upper == "SAFE":
        return "CAUTION"
    return upper

def make_envelope(
    value: Any,
    source_type: str,
    as_of: Any,
    source: str,
    confidence: float = 1.0,
    forced_status: Optional[str] = None,
    now: Optional[datetime] = None
) -> Dict[str, Any]:
    """Wraps any scalar or entity attribute into the contract data envelope."""
    status = forced_status or compute_status(source_type, as_of, now=now)
    as_of_iso = parse_iso_datetime(as_of).isoformat() if as_of else None
    return {
        "value": value,
        "status": status,
        "as_of": as_of_iso,
        "source": source,
        "confidence": confidence
    }
