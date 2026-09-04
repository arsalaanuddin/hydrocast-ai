# backend/services/rainfall_buffer.py
from datetime import datetime
from typing import Dict, Any

class RainfallDataBuffer:
    """
    Stores live Model 1 telemetry provided by your teammate.
    Falls back to regional baselines if the live feed has not sent a packet yet.
    """
    def __init__(self):
        self.latest_telemetry: Dict[str, Any] = {
            "city_key": "mumbai",
            "rain_rate_mmhr": 38.5,
            "radar_dbz": 46.2,
            "source": "NASA_IMERG_GPM_COUPLED",
            "timestamp_utc": datetime.utcnow().isoformat(),
            "is_live_stream": False
        }

    def update_from_model1(self, rain_rate_mmhr: float, radar_dbz: float, city_key: str = "mumbai", source: str = "NASA_IMERG"):
        self.latest_telemetry = {
            "city_key": city_key.lower(),
            "rain_rate_mmhr": float(rain_rate_mmhr),
            "radar_dbz": float(radar_dbz),
            "source": source,
            "timestamp_utc": datetime.utcnow().isoformat(),
            "is_live_stream": True
        }

    def get_latest(self) -> Dict[str, Any]:
        return self.latest_telemetry

rainfall_buffer = RainfallDataBuffer()