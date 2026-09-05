import networkx as nx
from typing import List, Dict, Any

class DrainageGraphEngine:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_network_graph(self, nodes: List[Dict[str, Any]], conduits: List[Dict[str, Any]]):
        """
        Constructs the directed drainage graph G = (V, E) where:
        Vertices (V) = Manholes, inlets, and junctions.
        Edges (E) = Underground stormwater conduits and box culverts.
        """
        self.graph.clear()
        
        for node in nodes:
            self.graph.add_node(
                node["id"], 
                lat=node["lat"], 
                lng=node["lng"], 
                capacity_used_pct=node.get("capacity_used_pct", 40.0),
                surcharge_status=node.get("surcharge_status", "normal")
            )

        for pipe in conduits:
            self.graph.add_edge(
                pipe["from_node"],
                pipe["to_node"],
                id=pipe["id"],
                length_m=pipe.get("length_m", 100.0),
                diameter_mm=pipe.get("diameter_mm", 800),
                slope=pipe.get("slope", 0.005),
                status=pipe.get("status", "normal")
            )

    def evaluate_surcharges(self, rainfall_accumulation_cm: float) -> Dict[str, Any]:
        """
        Evaluates hydraulic head and pipe capacity limits. 
        Forces backflow surcharge if inflow exceeds maximum pipe conveyance.
        """
        surcharged_pipes = []
        overflow_nodes = []

        for u, v, data in self.graph.edges(data=True):
            # Manning's open channel proxy calculation
            diameter_m = data["diameter_mm"] / 1000.0
            cross_section_area = 3.1416 * (diameter_m / 2.0) ** 2
            max_velocity = 2.5 * (data["slope"] ** 0.5) * (diameter_m ** (2/3))
            q_max_capacity = cross_section_area * max_velocity * 1000.0 # L/s

            # Estimated inflow driven by surface accumulation
            q_inflow = rainfall_accumulation_cm * 12.5 * cross_section_area * 1000.0

            if q_inflow > q_max_capacity or rainfall_accumulation_cm >= 30.0:
                data["status"] = "surcharged"
                surcharged_pipes.append(data["id"])
                
                # Flag connected nodes for manhole overflow
                if self.graph.has_node(u):
                    self.graph.nodes[u]["surcharge_status"] = "overflow"
                    overflow_nodes.append(u)
            else:
                data["status"] = "normal"

        return {
            "surcharged_conduits": surcharged_pipes,
            "overflow_nodes": list(set(overflow_nodes))
        }