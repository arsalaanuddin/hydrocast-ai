# backend/ml/simulate_swmm.py
import os
try:
    from importlib import import_module
    _pyswmm = import_module("pyswmm")
    Simulation = _pyswmm.Simulation
    Nodes = _pyswmm.Nodes
except ImportError as exc:
    raise ImportError(
        "pyswmm is required. Install it with: pip install pyswmm"
    ) from exc

try:
    pd = import_module("pandas")
except ImportError as exc:
    raise ImportError(
        "pandas is required. Install it with: pip install pandas"
    ) from exc

def simulate_flooding(swmm_inp_file, output_csv_path="flood_surcharge_results.csv"):
    flood_data = []
    
    # Initialize the SWMM simulation
    with Simulation(swmm_inp_file) as sim:
        node_objects = Nodes(sim)
        
        print(f"Running SWMM simulation for {swmm_inp_file}...")
        
        # Step through the simulation in time
        for step in sim:
            pass # The engine handles the routing math internally
        
        # After the storm finishes, check every manhole for overflow
        for node in node_objects:
            if node.flooding > 0: # Flooding is measured in Liters or Cubic Meters
                flood_data.append({
                    "node_id": node.nodeid,
                    "total_flood_volume_m3": node.flooding
                })
    
    df = pd.DataFrame(flood_data)
    df.to_csv(output_csv_path, index=False)
    print(f"Simulation complete. {len(df)} manholes overflowed. Saved to {output_csv_path}")
    return df