import networkx as nx

def calculate_flood_aware_route(graph: nx.Graph, source_node, target_node, depth_lookup, max_safe_depth=30.0):
    """
    Recalculates edge weights based on real-time water accumulation depth.
    Cost = Distance * (1 + alpha * Depth^2)
    """
    def flood_weight(u, v, data):
        base_length = data.get('length', 100.0)
        edge_key = (u, v)
        flood_depth = depth_lookup.get(edge_key, 0.0)
        
        # Hard penalty for submerged routes (>30 cm)
        if flood_depth > max_safe_depth:
            return 1e8 
        
        # Dynamic quadratic penalty for shallow water
        penalty = 1.0 + 0.05 * (flood_depth ** 2)
        return base_length * penalty

    try:
        path = nx.astar_path(graph, source_node, target_node, heuristic=None, weight=flood_weight)
        return {"status": "success", "path": path}
    except nx.NetworkXNoPath:
        return {"status": "error", "message": "No safe route available above flood threshold."}