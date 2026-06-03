/**
 * hooks/useRoadtripSolver.ts
 *
 * React hook that calls our Next.js proxy → Cloud Function → OR-Tools.
 *
 * Usage:
 *   const { solve, routes, loading, error } = useRoadtripSolver();
 *   await solve(locations, destination);
 */

import { useState, useCallback } from "react";
import { SOLVER_CAPACITY_ERROR_MESSAGE } from "@/lib/solver-error";

export type LocationData = {
  id: string;
  is_driver: boolean;
  seats: number;
  latitude: number;
  longitude: number;
};

export type Destination = {
  latitude: number;
  longitude: number;
};

/**
 * Each route is an ordered array of ids.
 * routes[i][0]  → driver id
 * routes[i][1…] → passengers in pickup order
 */
export type Routes = string[][];

export function useRoadtripSolver() {
  const [routes, setRoutes] = useState<Routes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solve = useCallback(
    async (locations: LocationData[], destination?: Destination) => {
      setLoading(true);
      setError(null);
      setRoutes(null);

      try {
        const res = await fetch("/api/solve-roadtrip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations, destination }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(SOLVER_CAPACITY_ERROR_MESSAGE);
        }

        setRoutes(data.routes);
        return data.routes as Routes;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { solve, routes, loading, error };
}
