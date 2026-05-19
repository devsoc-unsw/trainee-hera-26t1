/**
 * app/api/solve-roadtrip/route.ts
 *
 * Next.js App Router API route.
 * Proxies the solve request to the Google Cloud Function so the
 * GCF URL is never exposed to the browser.
 */

import { NextRequest, NextResponse } from "next/server";

const GCF_URL = process.env.ROADTRIP_SOLVER_URL; // set in .env.local

export type LocationData = {
  id: string;
  is_driver: boolean;
  seats: number;
  latitude: number;
  longitude: number;
};

export type SolveRequest = {
  locations: LocationData[];
  destination?: { latitude: number; longitude: number };
};

export type SolveResponse = {
  routes: string[][];   // each array: [driverId, passengerId, ...]
};

export async function POST(req: NextRequest) {
  if (!GCF_URL) {
    return NextResponse.json(
      { error: "ROADTRIP_SOLVER_URL env var is not set." },
      { status: 500 }
    );
  }

  const body: SolveRequest = await req.json();

  const gcfRes = await fetch(GCF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await gcfRes.json();

  return NextResponse.json(data, { status: gcfRes.status });
}
