"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readApiError } from "@/lib/api-error";
import { MAX_PASSENGER_SEATS } from "@/lib/participant-seats";
import { getTripSession } from "@/lib/trip-session";
import { cn } from "@/lib/utils";

const defaultInputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

type AdminDriverSeatsFormProps = {
  tripId: string;
  username: string;
  initialSeats: number | null;
  onSaved?: () => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
};

export function AdminDriverSeatsForm({
  tripId,
  username,
  initialSeats,
  onSaved,
  className,
  inputClassName = defaultInputClassName,
  buttonClassName,
}: AdminDriverSeatsFormProps) {
  const [seatsInput, setSeatsInput] = useState("");
  const [savedSeats, setSavedSeats] = useState<number | null>(initialSeats);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSavedSeats(initialSeats);
    setSeatsInput(
      typeof initialSeats === "number" ? String(initialSeats) : "",
    );
    setError(null);
    setSuccess(false);
  }, [username, initialSeats]);

  const parsed = Number.parseInt(seatsInput, 10);
  const isValidInput =
    seatsInput !== "" &&
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= MAX_PASSENGER_SEATS;
  const hasChanges = isValidInput && parsed !== savedSeats;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidInput || !hasChanges) return;

    const session = getTripSession();
    if (!session) {
      setError("No active trip session found");
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
          username,
          trip_id: tripId,
          seats: parsed,
          caller_username: session.username,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not save seats"));
        return;
      }

      const json = (await res.json()) as { participant: { seats: number | null } };
      const seats = json.participant.seats ?? parsed;
      setSavedSeats(seats);
      setSeatsInput(String(seats));
      setSuccess(true);
      onSaved?.();
    } catch {
      setError("Could not save seats");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-2", className)}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-atlas-teal">
          Passenger seats
        </span>
        <input
          type="number"
          min={0}
          max={MAX_PASSENGER_SEATS}
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
          aria-describedby={`admin-seats-hint-${username}`}
        />
      </label>
      <p id={`admin-seats-hint-${username}`} className="text-xs text-slate-500">
        How many passengers they can take (not including the driver).
        {savedSeats !== null && (
          <>
            {" "}
            Current:{" "}
            <span className="font-medium text-slate-700">{savedSeats}</span>.
          </>
        )}
      </p>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600" role="status">
          Seats saved.
        </p>
      )}
      <button
        type="submit"
        disabled={isSaving || !hasChanges}
        className={cn(
          "rounded-xl bg-atlas-teal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70",
          buttonClassName,
        )}
      >
        {isSaving ? "Saving…" : "Save seats"}
      </button>
    </form>
  );
}
