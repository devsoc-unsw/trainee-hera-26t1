#!/usr/bin/env node
/**
 * test-roadtrip-api.js — End-to-end test for the VRP solver integration.
 *
 * Tests:
 *   1. Next.js API route → Cloud Function → OR-Tools solver
 *   2. Full response chain with sample data
 *
 * Run with:
 *   node test-roadtrip-api.js
 *
 * Make sure:
 *   - pnpm dev is running (server on http://localhost:3000)
 *   - ROADTRIP_SOLVER_URL is set in .env.local
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Sample location data: 2 drivers, 6 passengers
const sampleLocations = [
  // Drivers
  {
    id: "driver_alice",
    is_driver: true,
    seats: 4,
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    id: "driver_bob",
    is_driver: true,
    seats: 2,
    latitude: -33.8688,
    longitude: 151.2093,
  },
  // Passengers
  {
    id: "passenger_charlie",
    is_driver: false,
    seats: 0,
    latitude: -33.8700,
    longitude: 151.2100,
  },
  {
    id: "passenger_diana",
    is_driver: false,
    seats: 0,
    latitude: -33.8710,
    longitude: 151.2110,
  },
  {
    id: "passenger_eve",
    is_driver: false,
    seats: 0,
    latitude: -33.8695,
    longitude: 151.2090,
  },
  {
    id: "passenger_frank",
    is_driver: false,
    seats: 0,
    latitude: -33.8705,
    longitude: 151.2105,
  },
  {
    id: "passenger_grace",
    is_driver: false,
    seats: 0,
    latitude: -33.8715,
    longitude: 151.2115,
  },
  {
    id: "passenger_henry",
    is_driver: false,
    seats: 0,
    latitude: -33.869,
    longitude: 151.208,
  },
];

// Optional: common destination
const destination = { latitude: -33.8725, longitude: 151.2125 };

async function testSolver() {
  console.log("=".repeat(70));
  console.log("VRP SOLVER — API INTEGRATION TEST");
  console.log("=".repeat(70));

  console.log(`\n📍 Test Configuration:`);
  console.log(`  API Base URL: ${BASE_URL}`);
  console.log(`  Endpoint: POST /api/solve-roadtrip`);
  console.log(`  Drivers: ${sampleLocations.filter((l) => l.is_driver).length}`);
  console.log(
    `  Passengers: ${sampleLocations.filter((l) => !l.is_driver).length}`
  );
  console.log(
    `  Total seat capacity: ${sampleLocations.filter((l) => l.is_driver).reduce((sum, l) => sum + l.seats, 0)}`
  );
  console.log(`  Destination: (${destination.latitude}, ${destination.longitude})`);

  const payload = {
    locations: sampleLocations,
    destination,
  };

  console.log(`\n📤 Sending POST request to ${BASE_URL}/api/solve-roadtrip`);
  console.log(
    `   Payload: ${JSON.stringify(payload, null, 2).split("\n").length} lines`
  );

  try {
    const response = await fetch(`${BASE_URL}/api/solve-roadtrip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ API Error:`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    if (!data.routes || !Array.isArray(data.routes)) {
      console.error(`\n❌ Invalid response format (no routes array)`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(`\n✅ Success!\n`);
    console.log(`📦 Routes (${data.routes.length} total):`);

    data.routes.forEach((route, i) => {
      const driver = route[0];
      const passengers = route.slice(1);
      console.log(`  Car ${i + 1}:`);
      console.log(`    Driver: ${driver}`);
      if (passengers.length > 0) {
        console.log(`    Pickup order: ${passengers.join(" → ")}`);
      } else {
        console.log(`    Pickup order: (no passengers)`);
      }
    });

    console.log(`\n📊 Summary:`);
    const totalPassengersAssigned = data.routes.reduce(
      (sum, r) => sum + (r.length - 1),
      0
    );
    console.log(`  Total routes: ${data.routes.length}`);
    console.log(`  Total passengers assigned: ${totalPassengersAssigned}`);
    console.log(
      `  Coverage: ${totalPassengersAssigned}/${sampleLocations.filter((l) => !l.is_driver).length}`
    );

    console.log(`\n📋 Full JSON Response:`);
    console.log(JSON.stringify(data, null, 2));

    console.log(
      `\n✨ All checks passed! The solver is working end-to-end.\n`
    );
  } catch (err) {
    console.error(`\n❌ Request failed:`);
    console.error(`  ${err.message}`);
    console.error(
      `\n💡 Tip: Make sure 'pnpm dev' is running on http://localhost:3000`
    );
    process.exit(1);
  }
}

testSolver();
