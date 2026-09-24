"""
Satellite flood extent adapter:
Consumes pre-processed flood extent GeoJSON (latest pass).
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

class SatelliteAdapter:
    def __init__(self):
        # Default latest pass timestamp: 4 hours ago
        self.pass_time = datetime.now(timezone.utc) - timedelta(hours=4)
        self.inundated_zones = {"ZONE-2", "ZONE-3"}

    async def get_latest_pass(self) -> Dict[str, Any]:
        return {
            "satellite": "Sentinel-1 SAR / Synthetic Aperture Radar",
            "pass_time": self.pass_time.isoformat(),
            "inundated_zone_ids": list(self.inundated_zones),
            "geojson_summary": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"zone_id": z_id, "flood_extent_sqkm": 4.5},
                        "geometry": {"type": "Polygon", "coordinates": [[[76.4, 25.1], [76.5, 25.1], [76.5, 25.2], [76.4, 25.1]]]}
                    }
                    for z_id in self.inundated_zones
                ]
            }
        }

satellite_adapter = SatelliteAdapter()
