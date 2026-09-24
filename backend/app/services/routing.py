"""
Routing service using Dijkstra / A* over the road network graph.
Implements edge penalties from Contract A3 / A8:
- SAFE: 1.0x
- CAUTION: 2.5x
- UNKNOWN: 4.0x
- BLOCKED: strictly excluded from graph
"""
import heapq
from typing import Dict, List, Optional, Tuple, Any

EDGE_MULTIPLIERS = {
    "SAFE": 1.0,
    "CAUTION": 2.5,
    "UNKNOWN": 4.0,
    "BLOCKED": None # Excluded
}

def find_shortest_route(
    nodes: List[str],
    edges: List[Dict[str, Any]],
    origin: str,
    destination: str,
    avoid_edges: Optional[List[Tuple[str, str]]] = None
) -> Dict[str, Any]:
    """
    Computes shortest path avoiding BLOCKED edges with multiplier penalties.
    Returns:
    {
      "status": "SUCCESS" | "NO_SAFE_ROUTE",
      "path": ["A", "C", "B"] or None,
      "distance_km": float,
      "effective_cost": float,
      "status_mix": {"SAFE": 2, ...}
    }
    """
    avoid_set = set(avoid_edges or [])

    # Build adjacency
    adj = {node: [] for node in nodes}
    for e in edges:
        u = e.get("from")
        v = e.get("to")
        status = e.get("status", "UNKNOWN").upper()
        multiplier = EDGE_MULTIPLIERS.get(status)

        # Exclude blocked or avoided edges
        if multiplier is None or status == "BLOCKED":
            continue
        if (u, v) in avoid_set or (v, u) in avoid_set:
            continue

        length_km = float(e.get("length_km", 1.0))
        effective_weight = length_km * multiplier
        if u in adj:
            adj[u].append((v, effective_weight, length_km, status))
        if v in adj:
            adj[v].append((u, effective_weight, length_km, status))

    # Priority queue: (cost, current_node, path, total_dist, status_counts)
    pq = [(0.0, origin, [origin], 0.0, {})]
    visited = {}

    while pq:
        cost, curr, path, total_dist, status_counts = heapq.heappop(pq)

        if curr in visited and visited[curr] <= cost:
            continue
        visited[curr] = cost

        if curr == destination:
            return {
                "status": "SUCCESS",
                "path": path,
                "distance_km": round(total_dist, 2),
                "effective_cost": round(cost, 2),
                "status_mix": status_counts
            }

        for nxt, weight, length, edge_status in adj.get(curr, []):
            if nxt not in visited or visited[nxt] > cost + weight:
                new_mix = dict(status_counts)
                new_mix[edge_status] = new_mix.get(edge_status, 0) + 1
                heapq.heappush(pq, (cost + weight, nxt, path + [nxt], total_dist + length, new_mix))

    return {
        "status": "NO_SAFE_ROUTE",
        "path": None,
        "distance_km": 0.0,
        "effective_cost": float("inf"),
        "status_mix": {}
    }
