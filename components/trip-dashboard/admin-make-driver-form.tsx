"use client";

import { useState, type FormEvent } from "react";
import { readApiError } from "@/lib/api-error";
import { MAX_PASSENGER_SEATS } from "@/lib/participant-seats";
import { getTripSession } from "@/lib/trip-session";
import { cn } from "@/lib/utils";

const defaultInputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

type AdminMakeDriverFormProps = {
  tripId: string;
  username: string;
  onSaved?: () => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
};

export function AdminMakeDriverForm({
  tripId,
  username,
  onSaved,
  className,
  inputClassName = defaultInputClassName,
  buttonClassName,
}: AdminMakeDriverFormProps) {
  const [seatsInput, setSeatsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsed = Number.parseInt(seatsInput, 10);
    if (
      seatsInput === "" ||
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > MAX_PASSENGER_SEATS
    ) {
      setError(`Enter passenger seats (0–${MAX_PASSENGER_SEATS})`);
      return;
    }

    const session = getTripSession();
    if (!session) {
      setError("No active trip session found");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/participants/update-role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          trip_id: tripId,
          is_driver: true,
          seats: parsed,
          caller_username: session.username,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not make member a driver"));
        return;
      }

      setSuccess(true);
      setSeatsInput("");
      onSaved?.();
    } catch {
      setError("Could not make member a driver");
    } finally {
      setIsSubmitting(false);
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
          disabled={isSubmitting}
          placeholder="e.g. 3"
          className={inputClassName}
          required
        />
      </label>
      <p className="text-xs text-slate-500">
        How many passengers they can take (not including the driver).
      </p>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600" role="status">
          {username} is now a driver.
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "rounded-xl bg-atlas-teal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70",
          buttonClassName,
        )}
      >
        {isSubmitting ? "Updating…" : "Make driver"}
      </button>
    </form>
  );
}
