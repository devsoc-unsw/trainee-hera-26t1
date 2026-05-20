"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { readApiError } from "@/lib/api-error";
import { getTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

const inputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

type DriverSeatsFormProps = {
  isDriver: boolean;
};

export function DriverSeatsForm({ isDriver }: DriverSeatsFormProps) {
  const session = getTripSession();
  const [savedSeats, setSavedSeats] = useState<number | null>(null);
  const [seatsInput, setSeatsInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSeats = useCallback(async () => {
    if (!session?.username || !session?.tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        username: session.username,
        trip_id: session.tripId,
      });
      const res = await fetch(`/api/participants/me?${params}`);

      if (!res.ok) {
        setError(await readApiError(res, "Could not load your seats"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      const seats = json.participant.seats;
      const value =
        typeof seats === "number" && Number.isFinite(seats) ? seats : null;
      setSavedSeats(value);
      setSeatsInput(value !== null ? String(value) : "");
    } catch {
      setError("Could not load your seats");
    } finally {
      setIsLoading(false);
    }
  }, [session?.tripId, session?.username]);

  useEffect(() => {
    void loadSeats();
  }, [loadSeats, isDriver]);

  if (!session || !isDriver) {
    return null;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading seat capacity…</p>;
  }

  const parsed = Number.parseInt(seatsInput, 10);
  const isValidInput =
    seatsInput !== "" &&
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= 15;
  const hasChanges = isValidInput && parsed !== savedSeats;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session.username || !session.tripId || !isValidInput || !hasChanges) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/participants/update-seats", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          trip_id: session.tripId,
          seats: parsed,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not save seats"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      const seats = json.participant.seats ?? parsed;
      setSavedSeats(seats);
      setSeatsInput(String(seats));
      setSuccess(true);
    } catch {
      setError("Could not save seats");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-atlas-teal">
          Passenger seats
        </span>
        <input
          type="number"
          min={0}
          max={15}
          step={1}
          inputMode="numeric"
          value={seatsInput}
          onChange={(e) => {
            setSeatsInput(e.target.value);
            setSuccess(false);
          }}
          disabled={isSaving}
          placeholder="e.g. 3"
          className={inputClassName}
          aria-describedby="driver-seats-hint"
        />
      </label>
      <p id="driver-seats-hint" className="text-xs text-slate-500">
        How many passengers you can take (not including you). Used when forming
        driving groups.
        {savedSeats !== null && (
          <>
            {" "}
            Saved: <span className="font-medium text-slate-700">{savedSeats}</span>
            .
          </>
        )}
      </p>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600" role="status">
          Seats saved.
        </p>
      )}
      <button
        type="submit"
        disabled={isSaving || !hasChanges}
        className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
      >
        {isSaving ? "Saving…" : "Save seats"}
      </button>
    </form>
  );
}
