"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { readApiError } from "@/lib/api-error";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { getTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

const inputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

export type SavedParticipantLocation = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
};

type ParticipantPinFormProps = {
  onSaved?: () => void;
};

export function ParticipantPinForm({ onSaved }: ParticipantPinFormProps) {
  const session = getTripSession();
  const mapsConfigured = isGoogleMapsConfigured();
  const [participant, setParticipant] = useState<TripParticipant | null>(null);
  const [savedLocation, setSavedLocation] =
    useState<SavedParticipantLocation | null>(null);
  const [pin, setPin] = useState<PinSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
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

      const json = (await res.json()) as {
        participant: TripParticipant;
        location: SavedParticipantLocation | null;
      };
      setParticipant(json.participant);
      setSavedLocation(json.location ?? null);
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
    if (!mapsConfigured) return;
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
      setSavedLocation({
        id: json.participant.location ?? savedLocation?.id ?? "",
        address: pin.address,
        latitude: pin.latitude,
        longitude: pin.longitude,
      });
      setPin(null);
      onSaved?.();
    } catch {
      setError("Could not save your pin");
    } finally {
      setIsSaving(false);
    }
  };

  const onRemove = async () => {
    if (!session?.username || !session?.tripId || !savedLocation?.address) return;

    setIsRemoving(true);
    setError(null);

    try {
      const res = await fetch("/api/participants/update-location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          trip_id: session.tripId,
          clear: true,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not remove your address"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setParticipant(json.participant);
      setSavedLocation(null);
      setPin(null);
      onSaved?.();
    } catch {
      setError("Could not remove your address");
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!participant) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error ?? "Could not load your profile"}
      </p>
    );
  }

  const hasSavedLocation = Boolean(savedLocation?.address);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-atlas-teal">
          Your location
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          {hasSavedLocation
            ? "Your saved address on this trip."
            : "Search for your address so others can see you on the trip map."}
        </p>
      </div>

      {hasSavedLocation && savedLocation && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 rounded-2xl border border-atlas-teal/15 bg-atlas-mist/40 px-4 py-3">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-atlas-teal"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-atlas-teal">Saved address</p>
              <p className="mt-0.5 text-sm text-slate-800">{savedLocation.address}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving || isSaving}
            className="rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
          >
            {isRemoving ? "Removing…" : "Remove address"}
          </button>
        </div>
      )}

      {!mapsConfigured && (
        <p className="rounded-2xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900" role="status">
          {hasSavedLocation
            ? "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to change your address."
            : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to set or change your address."}
        </p>
      )}

      {mapsConfigured && (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">
              {hasSavedLocation ? "Update address" : "Your location"}
            </span>
            <PlacesAutocompleteInput
              id="dashboard-pin-search"
              value={pin}
              onChange={setPin}
              disabled={isSaving || isRemoving}
              placeholder={
                hasSavedLocation
                  ? "Search for a new address…"
                  : "Start typing your address…"
              }
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
            disabled={isSaving || isRemoving || !isValidPin(pin)}
            className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
          >
            {isSaving
              ? "Saving…"
              : hasSavedLocation
                ? "Update pin"
                : "Save pin"}
          </button>
        </form>
      )}

      {error && !mapsConfigured && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
