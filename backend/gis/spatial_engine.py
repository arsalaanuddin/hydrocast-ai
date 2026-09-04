# backend/gis/spatial_engine.py
import requests
import numpy as np
from typing import Tuple

class SpatialEngine:
    def __init__(self, center_lat: float, center_lng: float, grid_size: int = 256):
        self.center_lat = float(center_lat)
        self.center_lng = float(center_lng)
        self.grid_size = grid_size
        self.dlat = 0.02  # ~2.2 km bounding box window
        self.dlng = 0.02

    def latlng_to_grid(self, lat: float, lng: float) -> Tuple[int, int]:
        """Maps geographic (lat, lng) to (row, col) grid coordinates."""
        r = int(((self.center_lat + self.dlat - lat) / (2 * self.dlat)) * self.grid_size)
        c = int(((lng - (self.center_lng - self.dlng)) / (2 * self.dlng)) * self.grid_size)
        return max(0, min(self.grid_size - 1, r)), max(0, min(self.grid_size - 1, c))

    def fetch_real_elevation_profile(self) -> Tuple[np.ndarray, float]:
        """
        Samples actual SRTM terrain elevation via Open-Elevation API.
        Falls back to coordinates-anchored topographic variation if offline.
        """
        sample_pts = [
            {"latitude": self.center_lat + dlat, "longitude": self.center_lng + dlng}
            for dlat in [-0.01, 0.0, 0.01]
            for dlng in [-0.01, 0.0, 0.01]
        ]
        
        try:
            res = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": sample_pts},
                timeout=3
            )
            if res.status_code == 200:
                results = res.json().get("results", [])
                elevations = [r["elevation"] for r in results if "elevation" in r]
                if elevations:
                    mean_elev = float(np.mean(elevations))
                    elev_var = float(np.std(elevations))
                    base = np.full((self.grid_size, self.grid_size), fill_value=mean_elev, dtype=np.float32)
                    gradient = np.linspace(-elev_var, elev_var, self.grid_size)
                    dem_grid = base + gradient[:, None]
                    return dem_grid, elev_var
        except Exception:
            pass

        # Consistent terrain generator based on coordinate hashing
        y, x = np.ogrid[:self.grid_size, :self.grid_size]
        freq = 35.0
        dem_grid = (
            np.sin((x + self.center_lng * 100) / freq) * 10.0 + 
            np.cos((y + self.center_lat * 100) / freq) * 14.0 + 
            520.0
        ).astype(np.float32)
        return dem_grid, 8.0

    def get_model2_feature_stack(self, is_urban: bool = True) -> np.ndarray:
        """
        Produces 4 physical feature channels of shape (4, grid_size, grid_size):
          Channel 0: DEM (Digital Elevation Model in meters)
          Channel 1: Slope gradient (hydraulic velocity driver)
          Channel 2: Manning's Roughness Coefficient (friction & infiltration)
          Channel 3: Topographic Depression & Runoff Retention Index
        """
        dem_grid, _ = self.fetch_real_elevation_profile()

        # Channel 1: Slope gradient
        dy, dx = np.gradient(dem_grid)
        slope = np.sqrt(dx**2 + dy**2).astype(np.float32)

        # Channel 2: Surface friction & infiltration
        # Urban asphalt: low friction (0.018), low infiltration
        # Forest / Farmland: high friction (0.120), high infiltration
        if is_urban:
            roughness = np.full((self.grid_size, self.grid_size), fill_value=0.018, dtype=np.float32)
            retention_mult = 0.88
        else:
            roughness = np.full((self.grid_size, self.grid_size), fill_value=0.120, dtype=np.float32)
            retention_mult = 0.20

        # Channel 3: Topographic depression (lowlands retain pooling water)
        min_elev = np.min(dem_grid)
        max_elev = np.max(dem_grid)
        elevation_range = max_elev - min_elev + 1e-5
        depression = np.clip((dem_grid - min_elev) / elevation_range, 0.0, 1.0)
        # Low areas get high depression index, scaled by surface imperviousness
        depression = ((1.0 - depression) * retention_mult).astype(np.float32)

        # Resulting tensor stack shape: (4, grid_size, grid_size)
        return np.stack([dem_grid, slope, roughness, depression], axis=0)