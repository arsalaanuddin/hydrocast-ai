# backend/ml/run_pipeline.py
import os
import osmnx as ox
import rasterio
from rasterio.transform import from_bounds
import numpy as np
from synthetic_drainage import generate_synthetic_drainage

# Selected high-priority flood zones from generated bboxes
TARGET_ZONES = {
    "Velachery_Chennai": (80.1967, 12.9564, 80.2467, 13.0014),
    "Dadar_Mumbai": (72.8188, 19.0062, 72.8688, 19.0512),
    "Bellandur_Bengaluru": (77.6436, 12.9103, 77.6936, 12.9553),
}

DATA_BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def build_corridor(zone_name: str, bbox: tuple):
    west, south, east, north = bbox
    corridor_dir = os.path.join(DATA_BASE_DIR, "corridors", zone_name)
    drainage_dir = os.path.join(DATA_BASE_DIR, "drainage", zone_name)
    os.makedirs(corridor_dir, exist_ok=True)
    os.makedirs(drainage_dir, exist_ok=True)

    gpkg_path = os.path.join(corridor_dir, f"{zone_name}_roads.gpkg")
    dem_path = os.path.join(corridor_dir, f"{zone_name}_dem.tif")

    # 1. Fetch real OSM road network
    if not os.path.exists(gpkg_path):
        print(f"[*] Fetching OSM road network for {zone_name}...")
        G = ox.graph_from_bbox(bbox=(north, south, east, west), network_type="drive")
        ox.save_graph_geopackage(G, filepath=gpkg_path)
        print(f" [✓] Saved roads to {gpkg_path}")

    # 2. Build synthetic DEM raster (256x256)
    if not os.path.exists(dem_path):
        print(f"[*] Building local DEM elevation raster for {zone_name}...")
        width, height = 256, 256
        transform = from_bounds(west, south, east, north, width, height)
        
        # Realistic terrain slope towards drainage outfall
        x = np.linspace(24.0, 6.0, width)
        y = np.linspace(18.0, 8.0, height)
        xx, yy = np.meshgrid(x, y)
        dem_data = (xx + yy + np.random.normal(0, 0.4, (height, width))).astype(np.float32)

        with rasterio.open(
            dem_path,
            'w',
            driver='GTiff',
            height=height,
            width=width,
            count=1,
            dtype=dem_data.dtype,
            crs='EPSG:4326',
            transform=transform,
        ) as dst:
            dst.write(dem_data, 1)
        print(f" [✓] Saved DEM to {dem_path}")

    # 3. Generate synthetic drainage network
    print(f"[*] Executing hydraulic drainage generation for {zone_name}...")
    generate_synthetic_drainage(gpkg_path, dem_path, drainage_dir)

if __name__ == "__main__":
    for zone, bbox in TARGET_ZONES.items():
        print(f"\n================ Processing {zone} ================")
        build_corridor(zone, bbox)