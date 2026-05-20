"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { getTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

export function DriverPassengerSwitch() {
  const [participant, setParticipant] = useState<TripParticipant | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-flight lock so two rapid clicks don't race. Ref (not state) because we
  // don't want any visual "saving" feedback — the toggle should feel instant.
  const savingRef = useRef(false);

  const session = getTripSession();
  const username = session?.username;
  const tripId = session?.tripId;

  const loadParticipant = useCallback(async () => {
    if (!username || !tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        username,
        trip_id: tripId,
      });
      const res = await fetch(`/api/participants/me?${params}`);

      if (!res.ok) {
        setError(await readApiError(res, "Could not load your role"));
        setParticipant(null);
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setParticipant(json.participant);
      setIsDriver(json.participant.is_driver);
    } catch {
      setError("Could not load your role");
    } finally {
      setIsLoading(false);
    }
  }, [username, tripId]);

  useEffect(() => {
    loadParticipant();
  }, [loadParticipant]);

  const onToggle = async () => {
    if (!username || !tripId || savingRef.current) return;

    const previousIsDriver = isDriver;
    const nextIsDriver = !isDriver;

    // Optimistic: flip the visual state immediately so the toggle feels
    // instant. We'll revert below if the server rejects the change.
    setIsDriver(nextIsDriver);
    setError(null);
    savingRef.current = true;

    try {
      const res = await fetch("/api/participants/update-role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          trip_id: tripId,
          is_driver: nextIsDriver,
        }),
      });

      if (!res.ok) {
        // Revert to the previous value on server-side failure.
        setIsDriver(previousIsDriver);
        setError(await readApiError(res, "Could not update role"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setParticipant(json.participant);
      // Reconcile with server truth in case it differs from our optimistic
      // guess (e.g. another tab changed it concurrently).
      setIsDriver(json.participant.is_driver);
    } catch {
      // Network error — revert to the previous value.
      setIsDriver(previousIsDriver);
      setError("Could not update role");
    } finally {
      savingRef.current = false;
    }
  };

  if (!session) {
    return (
      <p className="text-sm text-slate-600">
        Join or create a trip to set your role.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading your role…</p>;
  }

  if (!participant) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error ?? "Could not find your trip membership."}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-atlas-teal/15 bg-white/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-atlas-teal">Your role</p>
          <p className="text-sm text-slate-600">
            {isDriver ? "Driver" : "Passenger"}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isDriver}
          aria-label={isDriver ? "Switch to passenger" : "Switch to driver"}
          onClick={onToggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${
            isDriver ? "bg-atlas-teal" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full bg-white shadow transition-transform duration-200 ${
              isDriver ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {isDriver
          ? "You’re marked as a driver for this trip."
          : "Passenger by default — toggle on if you’re driving."}
      </p>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
