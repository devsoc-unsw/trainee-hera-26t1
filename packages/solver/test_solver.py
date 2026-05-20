"""
test_solver.py — Local test harness for the VRP solver.

Run with:
  cd packages/solver/
  python test_solver.py
"""

from main import solve_vrp
import json


def main():
    # Sample location data: 2 drivers, 6 passengers
    locations = [
        # Drivers
        {"id": "driver_alice", "is_driver": True, "seats": 4, "latitude": -33.8688, "longitude": 151.2093},
        {"id": "driver_bob", "is_driver": True, "seats": 2, "latitude": -33.8688, "longitude": 151.2093},
        # Passengers
        {"id": "passenger_charlie", "is_driver": False, "seats": 0, "latitude": -33.8700, "longitude": 151.2100},
        {"id": "passenger_diana", "is_driver": False, "seats": 0, "latitude": -33.8710, "longitude": 151.2110},
        {"id": "passenger_eve", "is_driver": False, "seats": 0, "latitude": -33.8695, "longitude": 151.2090},
        {"id": "passenger_frank", "is_driver": False, "seats": 0, "latitude": -33.8705, "longitude": 151.2105},
        {"id": "passenger_grace", "is_driver": False, "seats": 0, "latitude": -33.8715, "longitude": 151.2115},
        {"id": "passenger_henry", "is_driver": False, "seats": 0, "latitude": -33.8690, "longitude": 151.2080},
    ]

    # Optional: a common destination (e.g., event venue)
    destination = {"latitude": -33.8725, "longitude": 151.2125}

    print("=" * 70)
    print("VRP SOLVER TEST")
    print("=" * 70)
    print(f"\n📍 Input Data:")
    print(f"  Drivers: {sum(1 for loc in locations if loc['is_driver'])}")
    print(f"  Passengers: {sum(1 for loc in locations if not loc['is_driver'])}")
    print(f"  Total seat capacity: {sum(loc['seats'] for loc in locations if loc['is_driver'])}")
    print(f"  Destination: {destination}")

    try:
        routes = solve_vrp(locations, destination)

        print(f"\n✅ Solver succeeded!\n")
        print("📦 Routes:")
        for i, route in enumerate(routes, 1):
            driver = route[0]
            passengers = route[1:] if len(route) > 1 else []
            print(f"  Car {i}:")
            print(f"    Driver: {driver}")
            if passengers:
                print(f"    Pickup order: {' → '.join(passengers)}")
            else:
                print(f"    Pickup order: (no passengers)")

        print(f"\n📊 Summary:")
        total_passengers = sum(len(r) - 1 for r in routes)
        print(f"  Total routes: {len(routes)}")
        print(f"  Total passengers assigned: {total_passengers}")

        print(f"\n📋 JSON Output:")
        print(json.dumps({"routes": routes}, indent=2))

    except Exception as e:
        print(f"\n❌ Solver failed: {e}")


if __name__ == "__main__":
    main()
