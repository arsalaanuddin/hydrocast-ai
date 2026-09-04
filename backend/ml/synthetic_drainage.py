# backend/ml/synthetic_drainage.py
import os

def sample_elevation(dem_src, lon, lat):
    """Sample elevation in meters from a GeoTIFF at given coordinates."""
    for val in dem_src.sample([(lon, lat)]):
        return float(val[0])

def generate_synthetic_drainage(road_gpkg_path, dem_tif_path, output_dir):
    try:
        import importlib
        rasterio = importlib.import_module("rasterio")
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Rasterio is required to generate drainage data. "
            "Install it with `pip install rasterio`."
        ) from exc

    try:
        import importlib
        gpd = importlib.import_module("geopandas")
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "GeoPandas is required to generate drainage data. "
            "Install it with `pip install geopandas`."
        ) from exc

    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load Road Network Nodes and Edges
    print("Loading road network geometry...")
    nodes_gdf = gpd.read_file(road_gpkg_path, layer="nodes")
    edges_gdf = gpd.read_file(road_gpkg_path, layer="edges")
    
    # 2. Open DEM raster
    print("Sampling elevation from DEM...")
    with rasterio.open(dem_tif_path) as dem:
        ground_elevations = []
        for point in nodes_gdf.geometry:
            elev = sample_elevation(dem, point.x, point.y)
            ground_elevations.append(elev)
            
    nodes_gdf['ground_elev_m'] = ground_elevations
    
    # Estimate burial depth (default 1.8m below road surface)
    BURIAL_DEPTH = 1.8
    nodes_gdf['invert_elev_m'] = nodes_gdf['ground_elev_m'] - BURIAL_DEPTH
    
    # 3. Create Node Lookup
    node_elev_lookup = nodes_gdf.set_index('osmid')['invert_elev_m'].to_dict()
    
    # 4. Process Pipes (Conduits)
    print("Generating directed conduits and hydraulic parameters...")
    conduits = []
    
    for idx, row in edges_gdf.iterrows():
        u = row['u']
        v = row['v']
        
        if u not in node_elev_lookup or v not in node_elev_lookup:
            continue
            
        elev_u = node_elev_lookup[u]
        elev_v = node_elev_lookup[v]
        length = float(row.get('length', 50.0))
        
        # Enforce gravity direction: From Higher to Lower
        if elev_u >= elev_v:
            from_node, to_node = u, v
            slope = max((elev_u - elev_v) / max(length, 1.0), 0.001)
        else:
            from_node, to_node = v, u
            slope = max((elev_v - elev_u) / max(length, 1.0), 0.001)
            
        # Sizing conduits by road hierarchy
        highway_type = str(row.get('highway', 'residential'))
        if 'primary' in highway_type or 'trunk' in highway_type:
            diameter_mm = 1200
        elif 'secondary' in highway_type or 'tertiary' in highway_type:
            diameter_mm = 800
        else:
            diameter_mm = 450
            
        conduits.append({
            'conduit_id': f"C_{idx}",
            'from_node': str(from_node),
            'to_node': str(to_node),
            'length_m': round(length, 2),
            'diameter_mm': diameter_mm,
            'slope': round(slope, 5),
            'manning_n': 0.013,  # Concrete pipe roughness
            'geometry': row['geometry']
        })
        
    conduits_gdf = gpd.GeoDataFrame(conduits, crs=edges_gdf.crs)
    
    # 5. Detect Potential Outfalls (Lowest 2% nodes by elevation)
    elevations = sorted(float(elev) for elev in nodes_gdf['ground_elev_m'])
    if elevations:
        percentile_position = (len(elevations) - 1) * 0.02
        lower_index = int(percentile_position)
        upper_index = min(lower_index + 1, len(elevations) - 1)
        fraction = percentile_position - lower_index
        elev_threshold = (
            elevations[lower_index]
            + fraction * (elevations[upper_index] - elevations[lower_index])
        )
    else:
        elev_threshold = float("inf")
    nodes_gdf['node_type'] = [
        'OUTFALL' if elev <= elev_threshold else 'JUNCTION'
        for elev in nodes_gdf['ground_elev_m']
    ]
    
    # 6. Export Shapefiles / GeoJSON
    manhole_path = os.path.join(output_dir, "drainage_nodes_manholes.geojson")
    conduit_path = os.path.join(output_dir, "drainage_conduits_pipes.geojson")
    
    nodes_gdf[['osmid', 'ground_elev_m', 'invert_elev_m', 'node_type', 'geometry']].to_file(manhole_path, driver="GeoJSON")
    conduits_gdf.to_file(conduit_path, driver="GeoJSON")
    
    print(f"Drainage network generated successfully:")
    print(f" -> Manholes/Inlets: {len(nodes_gdf)} exported to {manhole_path}")
    print(f" -> Conduits/Pipes:  {len(conduits_gdf)} exported to {conduit_path}")