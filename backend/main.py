# backend/main.py

import os
import json
import datetime
import time
import numpy as np
import cv2
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from gis.spatial_engine import SpatialEngine
from gis.elevation_service import fetch_elevation_grid, compute_terrain_gradients
from ml.inundation_surrogate import FusionNeuralNetwork
from services.osm_service import fetch_roads_near_point
from services.drainage_graph import DrainageGraphEngine
from services.sitrep_service import generate_gemini_sitrep

load_dotenv()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

app = FastAPI(
    title="HydroCast AI // Command Center Coupled Engine",
    version="4.1.0",
    description="Pan-India Multi-Corridor Disaster Response & Hydrologic Simulation API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

drainage_engine = DrainageGraphEngine()
model2_weights = os.path.join(os.path.dirname(__file__), "ml", "model2_inundation.pth")
model2_engine = FusionNeuralNetwork(weights_path=model2_weights if os.path.exists(model2_weights) else None)

def fetch_live_weather_from_api(lat: float, lng: float) -> float:
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_actual_api_key_here":
        raise ValueError("OPENWEATHER_API_KEY is missing or invalid in your .env file!")
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}&units=metric"
    res = requests.get(url, timeout=5)
    if res.status_code == 200:
        data = res.json()
        rain_data = data.get("rain", {})
        return float(rain_data.get("1h", 0.0))
    else:
        raise Exception(f"OpenWeather API Error: {res.status_code} - {res.text}")

def compute_rain_rate(raw_dbz: float) -> float:
    clamped_dbz = np.clip(raw_dbz, 0.0, 65.0)
    if clamped_dbz <= 15.0:
        return 0.0
    z_linear = 10.0 ** (clamped_dbz / 10.0)
    rate = (z_linear / 200.0) ** (1.0 / 1.6)
    return round(float(np.clip(rate, 0.0, 300.0)), 2)

class DynamicPointRequest(BaseModel):
    lat: float
    lng: float
    place_name: Optional[str] = None
    rainfall_accumulation_cm: Optional[float] = Field(default=None)
    simulation_level: Optional[int] = None
    lead_time_minutes: Optional[int] = Field(default=30, ge=0, le=180)
@app.post("/predict/live-nowcast")
@app.post("/api/simulation/stress-test")
@app.post("/api/forecast/realtime")
async def coupled_nowcast(req: DynamicPointRequest):
    t_start = time.perf_counter()

    target_lat = float(req.lat)
    target_lng = float(req.lng)
    lead_time = req.lead_time_minutes if req.lead_time_minutes is not None else 30
    is_live_mode = (req.simulation_level == 0) or (req.simulation_level is None and req.rainfall_accumulation_cm in (0, None))

    # 1. Atmospheric & Radar Telemetry Layer
    if is_live_mode:
        live_rain_mmhr = fetch_live_weather_from_api(target_lat, target_lng)
        if live_rain_mmhr > 0.0:
            source_mode = f"Live OpenWeather API Feed ({live_rain_mmhr} mm/hr)"
            rain_rate_mmhr = live_rain_mmhr
            simulated_dbz = min(65.0, 20.0 + (live_rain_mmhr * 1.5))
            storm_present = True
            sim_cm = round(live_rain_mmhr * 0.15, 1)
        else:
            source_mode = "Live Satellite / Clear Sky (0 mm/hr)"
            rain_rate_mmhr = 0.0
            simulated_dbz = 10.0
            storm_present = False
            sim_cm = 0.0
    else:
        sim_cm = float(req.simulation_level if req.simulation_level is not None else req.rainfall_accumulation_cm)
        source_mode = f"Simulation Sandbox ({sim_cm:.1f} cm Deluge)"
        simulated_dbz = 18.0 + (sim_cm * 0.75)
        rain_rate_mmhr = compute_rain_rate(simulated_dbz)
        storm_present = True

    # 2. GIS & Infrastructure Extraction Layer (OSM + Elevation)
    input_place_name = req.place_name or "Patancheru Sector"
    spatial_data = fetch_roads_near_point(target_lat, target_lng, radius_meters=2500, place_name=input_place_name)
    real_roads = spatial_data.get("streets", [])
    drainage_conduits = spatial_data.get("conduits", [])
    raw_manholes = spatial_data.get("manholes", [])
    is_urban = spatial_data.get("is_urban", True)
    zone_classification = spatial_data.get("zone_classification", "Industrial / Urban Core")

    elevation_grid = fetch_elevation_grid(target_lat, target_lng)
    terrain_gradients = compute_terrain_gradients(elevation_grid)

    # 3. Neural Surrogate & Drainage Graph Interlock
    spatial_engine = SpatialEngine(center_lat=target_lat, center_lng=target_lng, grid_size=256)
    model2_stack = spatial_engine.get_model2_feature_stack(is_urban=is_urban)

    grid_size = spatial_engine.grid_size
    rain_grid = np.full((grid_size, grid_size), fill_value=rain_rate_mmhr, dtype=np.float32)
    depth_2d_grid = model2_engine.predict_depth_grid(rain_grid, model2_stack)

    drainage_engine.build_network_graph(raw_manholes, drainage_conduits)
    hydraulic_evaluation = drainage_engine.evaluate_surcharges(sim_cm)

    # 4. Routes & Evacuation Interlock Layer
    inundated_streets = []
    blocked_count = 0
    submerged_subways = []

    for road in real_roads:
        r, c = spatial_engine.latlng_to_grid(road["lat"], road["lng"])
        cell_depth = float(depth_2d_grid[r, c])
        computed_depth = round((12.0 * (sim_cm / 25.0)) + (cell_depth * 0.1), 1)
        is_closed = computed_depth >= 30.0

        if is_closed:
            blocked_count += 1
            if road.get("is_subway"):
                submerged_subways.append(road["name"])

        inundated_streets.append({
            "id": road["id"],
            "name": road["name"],
            "lat": road["lat"],
            "lng": road["lng"],
            "depth_cm": computed_depth,
            "status": "Critical Hazard / Impassable" if is_closed else ("Caution / Waterlogged" if computed_depth > 10.0 else "Passable"),
            "subway_drain_blocked": is_closed and road.get("is_subway", False)
        })

    drainage_nodes = []
    for mh in raw_manholes:
        cap = min(100.0, round(40.0 * (sim_cm / 25.0), 1))
        is_overflow = mh["id"] in hydraulic_evaluation["overflow_nodes"] or cap >= 85.0
        drainage_nodes.append({
            "id": mh["id"],
            "name": mh["name"],
            "lat": mh["lat"],
            "lng": mh["lng"],
            "type": mh.get("type", "manhole"),
            "capacity_used_pct": cap,
            "flow_rate_m3s": round(3.0 * (sim_cm / 20.0), 2),
            "surcharge_status": "overflow" if is_overflow else "normal"
        })

    return {
        "status": "success",
        "place_name": input_place_name,
        "center_coordinates": {"lat": target_lat, "lng": target_lng},
        "inference_latency_ms": round((time.perf_counter() - t_start) * 1000, 1),
        "peak_water_depth_cm": max([s["depth_cm"] for s in inundated_streets]) if inundated_streets else 0.0,
        "storm_detected": storm_present,
        "active_cloudburst_risk": sim_cm >= 25.0,
        "weather_summary": {
            "rain_rate_mmhr": rain_rate_mmhr,
            "radar_reflectivity_dbz": round(simulated_dbz, 1),
            "source": source_mode
        },
        "simulation_level": sim_cm,
        "zone_classification": zone_classification,
        "inundated_streets": inundated_streets,
        "drainage_nodes": drainage_nodes,
        "drainage_conduits": drainage_conduits,
        "total_blocked_roads": blocked_count,
        "critical_subways_submerged": submerged_subways,
        "evacuation_corridor": {
            "name": f"Elevated Ridge Bypass for {input_place_name}",
            "status": "Active Safe Route"
        }
    }
@app.post("/predict/live-nowcast")
@app.post("/api/simulation/stress-test")
@app.post("/api/forecast/realtime")
async def coupled_nowcast(req: DynamicPointRequest):
    t_start = time.perf_counter()

    target_lat = float(req.lat)
    target_lng = float(req.lng)
    lead_time = req.lead_time_minutes if req.lead_time_minutes is not None else 30
    is_live_mode = (req.simulation_level == 0) or (req.simulation_level is None and req.rainfall_accumulation_cm in (0, None))

    # STAGE 1: Atmospheric Telemetry & Marshall-Palmer Inversion
    if is_live_mode:
        live_rain_mmhr = fetch_live_weather_from_api(target_lat, target_lng)
        if live_rain_mmhr > 0.0:
            source_mode = f"Live OpenWeather API Feed ({live_rain_mmhr} mm/hr)"
            rain_rate_mmhr = live_rain_mmhr
            simulated_dbz = min(65.0, 20.0 + (live_rain_mmhr * 1.5))
            storm_present = True
            sim_cm = round(live_rain_mmhr * 0.15, 1)
        else:
            source_mode = "Live Satellite / Clear Sky (0 mm/hr)"
            rain_rate_mmhr = 0.0
            simulated_dbz = 10.0
            storm_present = False
            sim_cm = 0.0
    else:
        sim_cm = float(req.simulation_level if req.simulation_level is not None else req.rainfall_accumulation_cm)
        source_mode = f"Simulation Sandbox ({sim_cm:.1f} cm Deluge)"
        simulated_dbz = 18.0 + (sim_cm * 0.75)
        rain_rate_mmhr = compute_rain_rate(simulated_dbz)
        if sim_cm > 0 and rain_rate_mmhr < (sim_cm * 1.8):
            rain_rate_mmhr = float(sim_cm * 2.2)
        storm_present = True

    # STAGE 2: Topographic & GIS Extraction
    input_place_name = req.place_name or "Metropolitan Sector"
    spatial_data = fetch_roads_near_point(target_lat, target_lng, radius_meters=2500, place_name=input_place_name)
    real_roads = spatial_data.get("streets", [])
    drainage_conduits = spatial_data.get("conduits", [])
    raw_manholes = spatial_data.get("manholes", [])
    is_urban = spatial_data.get("is_urban", True)
    zone_classification = spatial_data.get("zone_classification", "Urban Core")

    elevation_grid = fetch_elevation_grid(target_lat, target_lng)
    terrain_gradients = compute_terrain_gradients(elevation_grid)

    # STAGE 3: Neural Surrogate Inference (Model 2 U-Net)
    spatial_engine = SpatialEngine(center_lat=target_lat, center_lng=target_lng, grid_size=256)
    model2_stack = spatial_engine.get_model2_feature_stack(is_urban=is_urban)

    grid_size = spatial_engine.grid_size
    rain_grid = np.full((grid_size, grid_size), fill_value=rain_rate_mmhr, dtype=np.float32)
    y, x = np.ogrid[:grid_size, :grid_size]
    center = grid_size // 2
    storm_core = np.exp(-((x - center)**2 + (y - center)**2) / (50.0**2)) * (rain_rate_mmhr * 0.4)
    rain_grid += storm_core.astype(np.float32)

    depth_2d_grid = model2_engine.predict_depth_grid(rain_grid, model2_stack)

    # STAGE 4: Drainage Graph Network Analysis G=(V,E)
    drainage_engine.build_network_graph(raw_manholes, drainage_conduits)
    hydraulic_evaluation = drainage_engine.evaluate_surcharges(sim_cm)

    runoff_coeff = 0.85 if is_urban else 0.18
    effective_rain_volume = sim_cm * runoff_coeff
    step_factor = lead_time / 60.0

    inundated_streets = []
    blocked_count = 0
    submerged_subways = []

    for road in real_roads:
        r, c = spatial_engine.latlng_to_grid(road["lat"], road["lng"])
        cell_depth = float(depth_2d_grid[r, c])
        is_unpaved = road.get("surface") in ["unpaved", "soil", "dirt"]
        base_depth = 28.0 if road.get("is_subway") else (5.0 if is_unpaved else 12.0)

        computed_depth = round((base_depth * (effective_rain_volume / 25.0)) + (cell_depth * 0.1) + (step_factor * 2.0), 1)
        is_closed = computed_depth >= 30.0 or (road.get("is_subway") and sim_cm >= 20.0 and is_urban)

        if is_closed:
            blocked_count += 1
            if road.get("is_subway"):
                submerged_subways.append(road["name"])

        # Status categorization matching frontend spec
        status = "Critical Hazard / Impassable" if is_closed else ("Caution / Waterlogged" if computed_depth > 10.0 else "Passable")
        inundated_streets.append({
            "id": road["id"],
            "name": road["name"],
            "lat": road["lat"],
            "lng": road["lng"],
            "depth_cm": computed_depth,
            "status": status,
            "subway_drain_blocked": is_closed and road.get("is_subway", False)
        })

    drainage_nodes = []
    for mh in raw_manholes:
        base_cap = float(mh.get("capacity_used_pct", 40))
        cap = min(100.0, round((base_cap * (sim_cm / 25.0)) + (step_factor * 10.0), 1))
        is_overflow = mh["id"] in hydraulic_evaluation["overflow_nodes"] or cap >= 85.0
        drainage_nodes.append({
            "id": mh["id"],
            "name": mh["name"],
            "lat": mh["lat"],
            "lng": mh["lng"],
            "type": mh.get("type", "manhole"),
            "capacity_used_pct": cap,
            "flow_rate_m3s": round(float(mh.get("flow_rate_m3s", 3.0)) * (sim_cm / 20.0), 2),
            "surcharge_status": "overflow" if is_overflow else ("warning" if cap >= 70.0 else "normal")
        })

    peak_depth = max([s["depth_cm"] for s in inundated_streets]) if inundated_streets else 0.0
    latency_ms = round((time.perf_counter() - t_start) * 1000, 1)

    return {
        "status": "success",
        "place_name": input_place_name,
        "center_coordinates": {"lat": target_lat, "lng": target_lng},
        "lead_time_minutes": lead_time,
        "inference_latency_ms": latency_ms,
        "peak_water_depth_cm": peak_depth,
        "storm_detected": storm_present,
        "active_cloudburst_risk": rain_rate_mmhr > 50.0 or sim_cm >= 25.0,
        "weather_summary": {
            "max_rain_rate_mm_hr": rain_rate_mmhr,
            "rain_rate_mmhr": rain_rate_mmhr,
            "radar_reflectivity_dbz": round(simulated_dbz, 1),
            "source": source_mode
        },
        "simulation_level": sim_cm,
        "zone_classification": zone_classification,
        "is_urban": is_urban,
        "inundated_streets": inundated_streets,
        "drainage_nodes": drainage_nodes,
        "drainage_conduits": drainage_conduits,
        "total_blocked_roads": blocked_count,
        "critical_subways_submerged": submerged_subways
    }

class SitRepExportRequest(BaseModel):
    place_name: str
    lat: float
    lng: float
    simulation_level: float
    peak_water_depth_cm: float
    total_blocked_roads: int
    critical_subways_submerged: List[str]
    inundated_streets: List[Dict[str, Any]]
    drainage_nodes: List[Dict[str, Any]]

@app.post("/api/export/sitrep")
async def export_sitrep_report(req: SitRepExportRequest):
    """
    Gemini-powered automated SITREP endpoint for executive command reporting.
    """
    payload = req.dict()
    ai_synthesis = await generate_gemini_sitrep(payload)
    
    return {
        "status": "success",
        "timestamp_utc": datetime.datetime.utcnow().isoformat(),
        "sitrep": {
            "agency": "HydroCast AI - National Disaster Management Command",
            "target_sector": req.place_name,
            "coordinates": {"lat": req.lat, "lng": req.lng},
            "severity_status": ai_synthesis.get("severity_classification", "RED ALERT"),
            "executive_summary": ai_synthesis.get("executive_summary"),
            "evacuation_directives": ai_synthesis.get("evacuation_directives"),
            "compromised_infrastructure_count": req.total_blocked_roads,
            "submerged_subways": req.critical_subways_submerged
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)