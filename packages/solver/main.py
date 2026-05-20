"""
Road Trip Car Grouping — Google Cloud Function
Solves a Vehicle Routing Problem (VRP) using OR-Tools.

Input (POST JSON):
  {
	"locations": [
	  { "id": "abc", "is_driver": true,  "latitude": -33.87, "longitude": 151.21, "seats": 3 },
	  { "id": "xyz", "is_driver": false, "latitude": -33.89, "longitude": 151.18, "seats": 0 },
	  ...
	],
	"destination": { "latitude": -33.95, "longitude": 151.17 }   // optional
  }

Output:
  {
	"routes": [
	  ["driver_id", "passenger_id_1", "passenger_id_2"],   // pickup order
	  ...
	]
  }

Each route list starts with the driver's id, followed by passengers in the
optimal pickup order (nearest-neighbour within the VRP solution).
"""

import json
import math
import functions_framework
from flask import Request
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


# ---------------------------------------------------------------------------
# CORS helper
# ---------------------------------------------------------------------------

def _cors_headers():
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	}


# ---------------------------------------------------------------------------
# Distance utilities
# ---------------------------------------------------------------------------

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
	"""Great-circle distance in whole metres (integer for OR-Tools)."""
	R = 6_371_000  # Earth radius in metres
	phi1, phi2 = math.radians(lat1), math.radians(lat2)
	dphi = math.radians(lat2 - lat1)
	dlam = math.radians(lon2 - lon1)
	a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
	return int(2 * R * math.asin(math.sqrt(a)))


def build_distance_matrix(coords: list[tuple[float, float]]) -> list[list[int]]:
	"""NxN symmetric distance matrix (metres, integer)."""
	n = len(coords)
	matrix = [[0] * n for _ in range(n)]
	for i in range(n):
		for j in range(i + 1, n):
			d = haversine_meters(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
			matrix[i][j] = d
			matrix[j][i] = d
	return matrix


# ---------------------------------------------------------------------------
# VRP solver
# ---------------------------------------------------------------------------

def solve_vrp(locations: list[dict], destination: dict | None = None) -> list[list[str]]:
	"""
	Run OR-Tools VRP and return routes as lists of location ids.

	Strategy
	--------
	* Depot  = a virtual node at index 0 representing the common destination
			   (or the centroid of all locations if no destination given).
	* Nodes  = depot (0) + all people (1 … N).
	* Drivers are vehicles; each vehicle starts and ends at the depot.
	* Passengers are demand-1 nodes; each driver has capacity = their `seats`.
	* The solver minimises total distance travelled.

	After the solver runs we reconstruct the ordered pickup list for each
	driver by reading their route in reverse (last pickup → depot becomes
	first pickup → … → destination).
	"""

	drivers = [loc for loc in locations if loc["is_driver"]]
	passengers = [loc for loc in locations if not loc["is_driver"]]

	# Edge case: no drivers
	if not drivers:
		raise ValueError("No drivers in the location list.")

	# Edge case: no passengers — every driver travels alone
	if not passengers:
		return [[d["id"]] for d in drivers]

	vehicle_capacities = [int(d["seats"]) for d in drivers]
	total_capacity = sum(vehicle_capacities)
	if total_capacity < len(passengers):
		raise ValueError(
			f"Not enough total seats for passengers. Capacity={total_capacity}, passengers={len(passengers)}."
		)

	# ------------------------------------------------------------------ #
	# Build node list:  [depot, *drivers, *passengers]                    #
	# ------------------------------------------------------------------ #
	if destination:
		depot_coord = (destination["latitude"], destination["longitude"])
	else:
		# Use centroid of all points as virtual depot
		all_lats = [loc["latitude"] for loc in locations]
		all_lons = [loc["longitude"] for loc in locations]
		depot_coord = (sum(all_lats) / len(all_lats), sum(all_lons) / len(all_lons))

	# Node index → location id (None for depot)
	node_ids: list[str | None] = [None]              # 0 = depot
	node_coords: list[tuple[float, float]] = [depot_coord]
	driver_nodes: list[int] = []
	passenger_nodes: list[int] = []

	for d in drivers:
		driver_nodes.append(len(node_ids))
		node_ids.append(d["id"])
		node_coords.append((d["latitude"], d["longitude"]))

	for p in passengers:
		passenger_nodes.append(len(node_ids))
		node_ids.append(p["id"])
		node_coords.append((p["latitude"], p["longitude"]))

	num_nodes = len(node_ids)
	num_vehicles = len(drivers)

	distance_matrix = build_distance_matrix(node_coords)

	# ------------------------------------------------------------------ #
	# OR-Tools data model                                                 #
	# ------------------------------------------------------------------ #
	data = {
		"distance_matrix": distance_matrix,
		"num_vehicles": num_vehicles,
		"depot": 0,
		# Demand: 0 for depot and driver nodes, 1 for each passenger
		"demands": [
			0 if (i == 0 or i in driver_nodes) else 1
			for i in range(num_nodes)
		],
		# Each vehicle can carry the number of seats defined on that driver
		"vehicle_capacities": vehicle_capacities,
	}

	# ------------------------------------------------------------------ #
	# Create routing model                                                #
	# ------------------------------------------------------------------ #
	manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, data["depot"])
	routing = pywrapcp.RoutingModel(manager)

	# Distance callback
	def distance_callback(from_index, to_index):
		f = manager.IndexToNode(from_index)
		t = manager.IndexToNode(to_index)
		return data["distance_matrix"][f][t]

	transit_cb_idx = routing.RegisterTransitCallback(distance_callback)
	routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_idx)

	# Capacity constraint
	def demand_callback(from_index):
		node = manager.IndexToNode(from_index)
		return data["demands"][node]

	demand_cb_idx = routing.RegisterUnaryTransitCallback(demand_callback)
	routing.AddDimensionWithVehicleCapacity(
		demand_cb_idx,
		0,                              # null capacity slack
		data["vehicle_capacities"],
		True,                           # start cumul at zero
		"Capacity",
	)

	# Each driver must start from their own location, not the depot.
	# We do this by forcing vehicles to visit their own driver node first.
	# Implement as: set each vehicle's start node to the driver's node.
	# OR-Tools supports custom start/end nodes per vehicle.

	# Re-create manager with per-vehicle starts (all end at depot=0)
	starts = driver_nodes          # vehicle v starts at driver_nodes[v]
	ends = [0] * num_vehicles      # all vehicles end at the depot

	manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
	routing = pywrapcp.RoutingModel(manager)

	transit_cb_idx = routing.RegisterTransitCallback(distance_callback)
	routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_idx)

	demand_cb_idx = routing.RegisterUnaryTransitCallback(demand_callback)
	routing.AddDimensionWithVehicleCapacity(
		demand_cb_idx, 0, data["vehicle_capacities"], True, "Capacity"
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
	search_params.time_limit.seconds = 10   # 10 s is plenty for ≤100 people

	# ------------------------------------------------------------------ #
	# Solve                                                               #
	# ------------------------------------------------------------------ #
	solution = routing.SolveWithParameters(search_params)

	if not solution:
		raise RuntimeError("OR-Tools could not find a solution.")

	# ------------------------------------------------------------------ #
	# Extract routes                                                      #
	# ------------------------------------------------------------------ #
	routes: list[list[str]] = []

	for v in range(num_vehicles):
		index = routing.Start(v)
		route_nodes: list[int] = []

		while not routing.IsEnd(index):
			node = manager.IndexToNode(index)
			route_nodes.append(node)
			index = solution.Value(routing.NextVar(index))

		# route_nodes: [driver_node, ...passengers in pickup order...]
		# Convert node indices → ids (skip depot node 0 if it appears)
		route_ids = [node_ids[n] for n in route_nodes if node_ids[n] is not None]
		routes.append(route_ids)

	return routes


# ---------------------------------------------------------------------------
# Cloud Function entry point
# ---------------------------------------------------------------------------

@functions_framework.http
def solve_road_trip(request: Request):
	# Handle CORS pre-flight
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

		locations = body["locations"]
		destination = body.get("destination")  # optional

		# Basic validation
		for loc in locations:
			for field in ("id", "is_driver", "latitude", "longitude", "seats"):
				if field not in loc:
					return (
						json.dumps({"error": f"Missing field '{field}' in location entry."}),
						400,
						{**_cors_headers(), "Content-Type": "application/json"},
					)
			if not isinstance(loc["seats"], int) or loc["seats"] < 0:
				return (
					json.dumps({"error": "Field 'seats' must be a non-negative integer."}),
					400,
					{**_cors_headers(), "Content-Type": "application/json"},
				)
			if loc["is_driver"] and loc["seats"] <= 0:
				return (
					json.dumps({"error": "Driver entries must have seats > 0."}),
					400,
					{**_cors_headers(), "Content-Type": "application/json"},
				)
			if (not loc["is_driver"]) and loc["seats"] != 0:
				return (
					json.dumps({"error": "Passenger entries must have seats = 0."}),
					400,
					{**_cors_headers(), "Content-Type": "application/json"},
				)

		routes = solve_vrp(locations, destination)

		return (
			json.dumps({"routes": routes}),
			200,
			{**_cors_headers(), "Content-Type": "application/json"},
		)

	except ValueError as e:
		return (
			json.dumps({"error": str(e)}),
			422,
			{**_cors_headers(), "Content-Type": "application/json"},
		)
	except Exception as e:
		return (
			json.dumps({"error": f"Solver error: {str(e)}"}),
			500,
			{**_cors_headers(), "Content-Type": "application/json"},
		)
