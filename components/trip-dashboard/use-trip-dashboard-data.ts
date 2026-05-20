"use client";

import { useCallback, useEffect, useState } from "react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { readApiError } from "@/lib/api-error";
import { getTripSession, type TripSession } from "@/lib/trip-session";
import type { Location, Trip, TripParticipant } from "@/types/database";

// Trip data with the resolved destination row joined in. `location` is the
// UUID FK (useful for passing back to APIs); `destination` is the human-
// readable place — null when the trip has no destination set yet.
export type TripDestination = Pick<
  Location,
  "id" | "name" | "address" | "latitude" | "longitude"
>;

export type TripSummary = Pick<
  Trip,
  "id" | "trip_name" | "trip_date" | "location" | "trip_code"
> & {
  destination: TripDestination | null;
};

export function useTripDashboardData() {
  // Read the trip session AFTER mount so server and first client render match
  // (avoids a hydration mismatch — localStorage is unavailable on the server).
  const [session, setSession] = useState<TripSession | null>(null);
  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [me, setMe] = useState<TripParticipant | null>(null);
  const [members, setMembers] = useState<TripMapParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(getTripSession());
  }, []);

  const loadData = useCallback(async () => {
    if (!session?.tripId || !session.username) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tripParams = new URLSearchParams({ trip_id: session.tripId });
      const meParams = new URLSearchParams({
        username: session.username,
        trip_id: session.tripId,
      });
      const mapParams = new URLSearchParams({ trip_id: session.tripId });

      const [tripRes, meRes, mapRes] = await Promise.all([
        fetch(`/api/trips/by-id?${tripParams}`),
        fetch(`/api/participants/me?${meParams}`),
        fetch(`/api/trips/map-locations?${mapParams}`),
      ]);

      if (!tripRes.ok) {
        setError(await readApiError(tripRes, "Could not load trip"));
        return;
      }
      if (!meRes.ok) {
        setError(await readApiError(meRes, "Could not load your profile"));
        return;
      }
      if (!mapRes.ok) {
        setError(await readApiError(mapRes, "Could not load members"));
        return;
      }

      const tripJson = (await tripRes.json()) as { trip: TripSummary };
      const meJson = (await meRes.json()) as { participant: TripParticipant };
      const mapJson = (await mapRes.json()) as {
        participants: TripMapParticipant[];
      };

      setTrip(tripJson.trip);
      setMe(meJson.participant);
      setMembers(mapJson.participants ?? []);
    } catch {
      setError("Could not load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [session?.tripId, session?.username]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { session, trip, me, members, isLoading, error, refresh: loadData };
}
