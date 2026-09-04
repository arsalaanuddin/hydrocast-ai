# backend/ml/run_swmm_test.py
import os
from geojson_to_swmm import build_swmm_inp
from simulate_swmm import simulate_flooding

ZONES = ["Velachery_Chennai", "Dadar_Mumbai", "Bellandur_Bengaluru"]
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

for zone in ZONES:
    drainage_dir = os.path.join(BASE_DIR, "drainage", zone)
    manholes = os.path.join(drainage_dir, "drainage_nodes_manholes.geojson")
    conduits = os.path.join(drainage_dir, "drainage_conduits_pipes.geojson")
    inp_path = os.path.join(drainage_dir, f"{zone}_model.inp")
    results_csv = os.path.join(drainage_dir, f"{zone}_surcharge_results.csv")

    if os.path.exists(manholes) and os.path.exists(conduits):
        print(f"\n--- Running Hydraulic Pipeline for {zone} ---")
        build_swmm_inp(manholes, conduits, inp_path)
        simulate_flooding(inp_path, results_csv)
    else:
        print(f"[!] GeoJSON files not found for {zone}. Run `python ml/run_pipeline.py` first.")