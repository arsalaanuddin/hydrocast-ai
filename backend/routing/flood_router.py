import networkx as nx
from typing import Dict, Any, List, Tuple

class FloodAwareRouter:
    """
    Emergency Transit Routing Engine.
    Uses NetworkX A* / Dijkstra with dynamic flood depth cost penalties.
    Bypasses low-lying submerged corridors (e.g., Milan Subway) via elevated flyovers.
    """
    def __init__(self):
        self.graph = self._build_mumbai_corridor_graph()

    def _build_mumbai_corridor_graph(self) -> nx.DiGraph:
        """
        Constructs the primary arterial and elevated bypass road graph for central Mumbai.
        Nodes contain (lat, lng) coordinates for Leaflet GeoJSON polyline mapping.
        """
        G = nx.DiGraph()

        # Critical Transit Nodes
        nodes = {
            "BANDRA_TERM": {"name": "Bandra Terminus", "lat": 19.0544, "lng": 72.8402},
            "WEH_FLYOVER_ENTRY": {"name": "WEH Elevated Flyover Entry", "lat": 19.0650, "lng": 72.8480},
            "WEH_FLYOVER_EXIT": {"name": "WEH Elevated Flyover Exit", "lat": 19.0920, "lng": 72.8550},
            "MILAN_SUBWAY_APPROACH": {"name": "Milan Subway Approach (SV Rd)", "lat": 19.0810, "lng": 72.8415},
            "MILAN_SUBWAY_DEPRESSION": {"name": "Milan Subway Underpass", "lat": 19.0838, "lng": 72.8428},
            "MILAN_SUBWAY_EXIT": {"name": "Milan Subway North Exit", "lat": 19.0865, "lng": 72.8435},
            "ANDHERI_HUB": {"name": "Andheri Emergency Hub", "lat": 19.1136, "lng": 72.8697}
        }

        for node_id, attrs in nodes.items():
            G.add_node(node_id, **attrs)

        # Edges (Road Segments): length in meters
        # Low-lying route through Milan Subway (Shortest, highly flood-vulnerable)
        G.add_edge("BANDRA_TERM", "MILAN_SUBWAY_APPROACH", length=3200.0, is_elevated=False)
        G.add_edge("MILAN_SUBWAY_APPROACH", "MILAN_SUBWAY_DEPRESSION", length=350.0, is_elevated=False)
        G.add_edge("MILAN_SUBWAY_DEPRESSION", "MILAN_SUBWAY_EXIT", length=350.0, is_elevated=False)
        G.add_edge("MILAN_SUBWAY_EXIT", "ANDHERI_HUB", length=3100.0, is_elevated=False)

        # Elevated expressway bypass (Longer distance, zero water accumulation)
        G.add_edge("BANDRA_TERM", "WEH_FLYOVER_ENTRY", length=1800.0, is_elevated=True)
        G.add_edge("WEH_FLYOVER_ENTRY", "WEH_FLYOVER_EXIT", length=3400.0, is_elevated=True)
        G.add_edge("WEH_FLYOVER_EXIT", "ANDHERI_HUB", length=2600.0, is_elevated=True)

        return G

    def find_routes(self, depth_lookup: Dict[str, float], max_safe_depth: float = 30.0) -> Dict[str, Any]:
        """
        Calculates both the standard shortest route and the flood-mitigated detour route.
        """
        source = "BANDRA_TERM"
        target = "ANDHERI_HUB"

        # Edge penalty function
        def flood_weight(u, v, data):
            base_length = data.get("length", 100.0)
            
            # Map edge nodes to depth lookup keys
            edge_depth = 0.0
            if "MILAN_SUBWAY" in u or "MILAN_SUBWAY" in v:
                edge_depth = depth_lookup.get("Milan Subway Underpass", depth_lookup.get("st-1", 0.0))

            # Severe penalty for submerged paths (>30 cm)
            if edge_depth > max_safe_depth:
                return 1e8

            # Quadratic penalty for shallow pooling
            penalty = 1.0 + 0.05 * (edge_depth ** 2)
            return base_length * penalty

        # 1. Unconstrained shortest route (what normal navigation apps show)
        try:
            shortest_path = nx.shortest_path(self.graph, source, target, weight="length")
            shortest_coords = [[self.graph.nodes[n]["lat"], self.graph.nodes[n]["lng"]] for n in shortest_path]
            shortest_dist_km = round(sum(self.graph[u][v]["length"] for u, v in zip(shortest_path[:-1], shortest_path[1:])) / 1000.0, 1)
        except nx.NetworkXNoPath:
            shortest_path, shortest_coords, shortest_dist_km = [], [], 0.0

        # 2. Flood-aware safe route
        try:
            safe_path = nx.astar_path(self.graph, source, target, heuristic=None, weight=flood_weight)
            safe_coords = [[self.graph.nodes[n]["lat"], self.graph.nodes[n]["lng"]] for n in safe_path]
            safe_dist_km = round(sum(self.graph[u][v]["length"] for u, v in zip(safe_path[:-1], safe_path[1:])) / 1000.0, 1)
            safe_found = True
        except nx.NetworkXNoPath:
            safe_path, safe_coords, safe_dist_km = [], [], 0.0
            safe_found = False

        milan_depth = depth_lookup.get("Milan Subway Underpass", depth_lookup.get("st-1", 35.0))

        return {
            "shortest_route": {
                "name": "Standard Shortest (SV Road / Milan Subway)",
                "distance_km": shortest_dist_km,
                "is_blocked": milan_depth > max_safe_depth,
                "submerged_chokepoints": 1 if milan_depth > max_safe_depth else 0,
                "path_nodes": shortest_path,
                "coordinates": shortest_coords
            },
            "flood_safe_route": {
                "name": "HydroCast Recommended Evacuation Corridor",
                "distance_km": safe_dist_km,
                "is_blocked": not safe_found,
                "submerged_chokepoints": 0,
                "path_nodes": safe_path,
                "coordinates": safe_coords,
                "status": "Clear - Elevated Western Express Flyover" if safe_found else "No viable path"
            }
        }