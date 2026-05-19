"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { readApiError } from "@/lib/api-error";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { getTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

const inputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

type ParticipantPinFormProps = {
  onSaved?: () => void;
};

export function ParticipantPinForm({ onSaved }: ParticipantPinFormProps) {
  const session = getTripSession();
  const [participant, setParticipant] = useState<TripParticipant | null>(null);
  const [pin, setPin] = useState<PinSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadParticipant = useCallback(async () => {
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
        setError(await readApiError(res, "Could not load your profile"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setParticipant(json.participant);
    } catch {
      setError("Could not load your profile");
    } finally {
      setIsLoading(false);
    }
  }, [session?.tripId, session?.username]);

  useEffect(() => {
    void loadParticipant();
  }, [loadParticipant]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.username || !session?.tripId) return;
    if (!isValidPin(pin)) {
      setError("Choose your address from the suggestions");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/participants/update-location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          trip_id: session.tripId,
          address: pin.address,
          latitude: pin.latitude,
          longitude: pin.longitude,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not save your pin"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setParticipant(json.participant);
      setPin(null);
      onSaved?.();
    } catch {
      setError("Could not save your pin");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (participant?.location) {
    return null;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-atlas-teal/15 bg-atlas-mist/40 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-atlas-teal">Set your pin</h3>
        <p className="mt-1 text-xs text-slate-600">
          Search for your address so others can see you on the trip map.
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-atlas-teal">Your location</span>
        <PlacesAutocompleteInput
          id="dashboard-pin-search"
          value={pin}
          onChange={setPin}
          disabled={isSaving}
          placeholder="Start typing your address…"
          className={inputClassName}
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSaving || !isValidPin(pin)}
        className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
      >
        {isSaving ? "Saving…" : "Save pin"}
      </button>
    </form>
  );
}
