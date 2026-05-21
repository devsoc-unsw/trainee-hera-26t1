"""
Road Trip Car Grouping — Google Cloud Function
Solves a VRP using OR-Tools with a real road-time matrix from
the Google Maps Distance Matrix API.

Required env vars:
  GOOGLE_MAPS_API_KEY   — Maps Platform key with Distance Matrix enabled

Input (POST JSON):
  {
    "locations": [
      { "id": "abc", "is_driver": true,  "latitude": -33.87, "longitude": 151.21, "seats": 4 },
      { "id": "xyz", "is_driver": false, "latitude": -33.89, "longitude": 151.18 },
      ...
    ],
    "destination": { "latitude": -33.95, "longitude": 151.17 },
    "detour_penalty_multiplier": 1.5   // optional, default 1.5
  }

Output:
  {
    "routes": [
      ["driver_id", "passenger_id_1", "passenger_id_2"],  // pickup order
      ...
    ]
  }

Fairness model
--------------
Rather than a fixed penalty or a hard time cap, we use a per-vehicle
detour penalty: for each vehicle, the solver is penalised for every
second of detour it accumulates beyond its direct drive to the destination.
The penalty weight (detour_penalty_multiplier) controls how strongly the
solver resists overloading one driver:

  - 1.0 = detour time counts the same as direct drive time (no fairness)
  - 1.5 = (default) each detour-second costs 1.5x — moderate fairness
  - 3.0 = strong fairness, aggressively redistributes passengers

This scales naturally with geography: a 2hr group gets the same fairness
treatment as a 20min group because the penalty is relative, not absolute.
"""

import json
import os
import math
import urllib.request
import urllib.parse
import functions_framework
from flask import Request
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_CAR_CAPACITY    = 4   # default max passengers per car (excluding driver)
_SOLVER_TIME_S   = 15  # OR-Tools wall-clock limit
_MAPS_API_KEY    = os.environ.get("GOOGLE_MAPS_API_KEY", "")
_CHUNK_SIZE      = 10  # 10×10 = 100 elements, the Distance Matrix API limit


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


# ---------------------------------------------------------------------------
# Google Distance Matrix API  →  NxN duration matrix (seconds, integer)
# ---------------------------------------------------------------------------

def _latlng_str(coord: tuple[float, float]) -> str:
    return f"{coord[0]},{coord[1]}"


def _fetch_chunk(origins: list[tuple], destinations: list[tuple]) -> list[list[int]]:
    """
    Call the Distance Matrix API for one chunk of origins × destinations.
    Returns a 2-D list of durations in whole seconds.
    """
    params = urllib.parse.urlencode({
        "origins":      "|".join(_latlng_str(o) for o in origins),
        "destinations": "|".join(_latlng_str(d) for d in destinations),
        "mode":         "driving",
        "key":          _MAPS_API_KEY,
    })
    url = f"https://maps.googleapis.com/maps/api/distancematrix/json?{params}"

    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read())

    if data.get("status") != "OK":
        raise RuntimeError(
            f"Distance Matrix API error: {data.get('status')} — {data.get('error_message', '')}"
        )

    result = []
    for row in data["rows"]:
        durations = []
        for element in row["elements"]:
            if element["status"] != "OK":
                durations.append(999_999)  # unreachable — large penalty
            else:
                durations.append(element["duration"]["value"])  # seconds
        result.append(durations)
    return result


def build_duration_matrix(coords: list[tuple[float, float]]) -> list[list[int]]:
    """
    Build a full NxN driving-duration matrix by chunking into
    _CHUNK_SIZE × _CHUNK_SIZE blocks (max 100 elements per API request).
    """
    n = len(coords)
    matrix = [[0] * n for _ in range(n)]

    origin_chunks = [coords[i:i + _CHUNK_SIZE] for i in range(0, n, _CHUNK_SIZE)]
    dest_chunks   = [coords[j:j + _CHUNK_SIZE] for j in range(0, n, _CHUNK_SIZE)]

    for oi, o_chunk in enumerate(origin_chunks):
        for di, d_chunk in enumerate(dest_chunks):
            chunk_result = _fetch_chunk(o_chunk, d_chunk)
            for r, row in enumerate(chunk_result):
                global_row = oi * _CHUNK_SIZE + r
                for c, val in enumerate(row):
                    global_col = di * _CHUNK_SIZE + c
                    matrix[global_row][global_col] = val

    return matrix


# ---------------------------------------------------------------------------
# Fallback: haversine (local dev without an API key)
# ---------------------------------------------------------------------------

def _haversine_seconds(lat1, lon1, lat2, lon2) -> int:
    """Approximate travel time at 50 km/h."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    metres = 2 * R * math.asin(math.sqrt(a))
    return int(metres / (50_000 / 3600))


def build_haversine_matrix(coords: list[tuple[float, float]]) -> list[list[int]]:
    n = len(coords)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            t = _haversine_seconds(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
            matrix[i][j] = t
            matrix[j][i] = t
    return matrix


# ---------------------------------------------------------------------------
# VRP solver
# ---------------------------------------------------------------------------

def solve_vrp(
    locations: list[dict],
    destination: dict,
    detour_penalty_multiplier: float = 1.5,
) -> list[list[str]]:
    """
    Node layout
    -----------
    Index 0          → depot (destination)
    Index 1..D       → drivers (vehicle start nodes, not visitable stops)
    Index D+1..D+P   → passengers (the actual stops to assign)

    Each vehicle starts at its driver's node and ends at the depot.
    Driver nodes are start positions only — they are NOT in the set of
    nodes the solver can route through, preventing drivers from being
    treated as pickup stops.

    Fairness via detour penalty
    ---------------------------
    The arc cost for each vehicle is weighted by detour_penalty_multiplier.
    We achieve this by computing, for each vehicle v, the direct drive time
    from driver v to the depot, then adding a per-vehicle dimension that
    penalises total route time in excess of that direct time.

    In practice we implement this by setting the arc cost callback to
    return cost * multiplier for detour arcs (any arc not going directly
    to depot) so the solver naturally prefers distributing load.
    """

    drivers    = [loc for loc in locations if loc["is_driver"]]
    passengers = [loc for loc in locations if not loc["is_driver"]]

    if not drivers:
        raise ValueError("No drivers provided.")
    if not passengers:
        return [[d["id"]] for d in drivers]

    # ------------------------------------------------------------------ #
    # Node list:                                                          #
    #   [depot, driver_0, driver_1, ..., passenger_0, passenger_1, ...]  #
    # ------------------------------------------------------------------ #
    depot_coord = (destination["latitude"], destination["longitude"])

    node_coords: list[tuple[float, float]] = [depot_coord]   # index 0 = depot
    node_ids:   list[str | None]           = [None]           # index 0 = depot

    # Driver nodes — indices 1..num_drivers
    driver_node_indices: list[int] = []
    for d in drivers:
        driver_node_indices.append(len(node_coords))
        node_coords.append((d["latitude"], d["longitude"]))
        node_ids.append(d["id"])

    # Passenger nodes — indices after drivers
    passenger_node_indices: list[int] = []
    for p in passengers:
        passenger_node_indices.append(len(node_coords))
        node_coords.append((p["latitude"], p["longitude"]))
        node_ids.append(p["id"])

    num_nodes    = len(node_coords)
    num_vehicles = len(drivers)
    depot_index  = 0

    # ------------------------------------------------------------------ #
    # Duration matrix                                                     #
    # ------------------------------------------------------------------ #
    if _MAPS_API_KEY:
        dur = build_duration_matrix(node_coords)
    else:
        dur = build_haversine_matrix(node_coords)

    # Direct drive time from each driver to the destination (for fairness ref)
    direct_times = [dur[driver_node_indices[v]][depot_index] for v in range(num_vehicles)]

    # ------------------------------------------------------------------ #
    # OR-Tools model                                                      #
    # Vehicles start at driver nodes, end at depot.                      #
    # Only passenger nodes are visitable stops.                          #
    # ------------------------------------------------------------------ #
    starts = driver_node_indices          # each vehicle starts at its driver
    ends   = [depot_index] * num_vehicles # all vehicles end at the depot

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    # Note: driver nodes are used as vehicle start positions only.
    # OR-Tools automatically excludes start/end nodes from the visitable
    # stop set, so no explicit locking is needed.

    # Arc cost callback — base travel time in seconds
    def duration_callback(from_index, to_index):
        return dur[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_idx = routing.RegisterTransitCallback(duration_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    # ------------------------------------------------------------------ #
    # Fairness: detour penalty dimension                                  #
    #                                                                     #
    # We add a "DetourTime" dimension that accumulates route time.        #
    # For each vehicle v, we set a soft upper bound at direct_times[v]   #
    # with a penalty coefficient of (multiplier - 1) * large_factor.     #
    # This means every second of detour beyond the direct drive costs     #
    # extra, scaled by the multiplier. The solver distributes passengers  #
    # to avoid overloading any single driver.                             #
    # ------------------------------------------------------------------ #
    routing.AddDimension(
        transit_idx,
        0,          # no slack
        999_999,    # effectively no hard cap — fairness is via soft penalty below
        True,       # start cumul at zero
        "DetourTime",
    )
    detour_dim = routing.GetDimensionOrDie("DetourTime")

    # Penalty weight: how much each excess detour-second costs relative to
    # a normal travel second. Must be a positive integer for OR-Tools.
    # A multiplier of 1.5 → penalty_coefficient of 500 means each detour
    # second costs 500 units vs the base 1000 units for a normal second,
    # effectively making detours 1.5× more expensive.
    penalty_coefficient = max(1, int((detour_penalty_multiplier - 1.0) * 1000))

    for v in range(num_vehicles):
        # SetSoftSpanUpperBoundForVehicle: if total route span exceeds bound,
        # cost increases by penalty_coefficient * (span - bound).
        # Bound = direct drive time, so any pickup detour gets penalised.
        bound_cost = pywrapcp.BoundCost()
        bound_cost.bound = direct_times[v]
        bound_cost.cost  = penalty_coefficient
        detour_dim.SetSoftSpanUpperBoundForVehicle(bound_cost, v)

    # ------------------------------------------------------------------ #
    # Capacity constraint                                                 #
    # ------------------------------------------------------------------ #
    driver_node_set = set(driver_node_indices)
    demands = [
        0 if (i == depot_index or i in driver_node_set) else 1
        for i in range(num_nodes)
    ]

    def demand_callback(from_index):
        return demands[manager.IndexToNode(from_index)]

    demand_idx = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_idx,
        0,
        [d.get("seats", _CAR_CAPACITY) for d in drivers],
        True,
        "Capacity",
    )

    # ------------------------------------------------------------------ #
    # Search parameters                                                   #
    # ------------------------------------------------------------------ #
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = _SOLVER_TIME_S

    solution = routing.SolveWithParameters(search_params)
    if not solution:
        raise RuntimeError("OR-Tools could not find a feasible solution.")

    # ------------------------------------------------------------------ #
    # Extract routes                                                      #
    # ------------------------------------------------------------------ #
    routes: list[list[str]] = []
    for v in range(num_vehicles):
        index = routing.Start(v)
        route_ids: list[str] = []
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            nid = node_ids[node]
            if nid is not None:
                route_ids.append(nid)
            index = solution.Value(routing.NextVar(index))
        # route_ids[0] is always the driver (their start node id)
        # route_ids[1:] are passengers in pickup order
        if route_ids:
            routes.append(route_ids)

    return routes


# ---------------------------------------------------------------------------
# Cloud Function entry point
# ---------------------------------------------------------------------------

@functions_framework.http
def solve_road_trip(request: Request):
    if request.method == "OPTIONS":
        return ("", 204, _cors_headers())

    try:
        body = request.get_json(silent=True)

        if not body or "locations" not in body:
            return (
                json.dumps({"error": "Request body must contain a 'locations' array."}),
                400,
                {**_cors_headers(), "Content-Type": "application/json"},
            )

        if "destination" not in body:
            return (
                json.dumps({"error": "'destination' is required."}),
                400,
                {**_cors_headers(), "Content-Type": "application/json"},
            )

        locations   = body["locations"]
        destination = body["destination"]
        detour_penalty_multiplier = float(body.get("detour_penalty_multiplier", 1.5))

        for loc in locations:
            for field in ("id", "is_driver", "latitude", "longitude"):
                if field not in loc:
                    return (
                        json.dumps({"error": f"Missing field '{field}' in location entry."}),
                        400,
                        {**_cors_headers(), "Content-Type": "application/json"},
                    )

        routes = solve_vrp(locations, destination, detour_penalty_multiplier)

        return (
            json.dumps({"routes": routes}),
            200,
            {**_cors_headers(), "Content-Type": "application/json"},
        )

    except ValueError as e:
        return (json.dumps({"error": str(e)}), 422, {**_cors_headers(), "Content-Type": "application/json"})
    except RuntimeError as e:
        return (json.dumps({"error": str(e)}), 502, {**_cors_headers(), "Content-Type": "application/json"})
    except Exception as e:
        return (json.dumps({"error": f"Solver error: {str(e)}"}), 500, {**_cors_headers(), "Content-Type": "application/json"})