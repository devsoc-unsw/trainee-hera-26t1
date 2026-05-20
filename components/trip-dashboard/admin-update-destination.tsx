"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { readApiError } from "@/lib/api-error";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { cn } from "@/lib/utils";

type Step = "idle" | "confirming" | "loading";

type AdminUpdateDestinationProps = {
  tripId: string;
  currentAddress: string | null;
  onUpdated?: () => void;
};

// TODO(server-auth): the underlying PATCH /api/trips/update-destination has no
// admin check yet — UI-only gating today. See the route's TODO for details.
//
// Note: we store the place's address string in `trips.location` (a text
// column). The lat/lng we receive from Google Maps autocomplete is captured
// purely as a UX gate — it lets us require the admin to pick a real place
// from the suggestions instead of free-typing junk. If the team later wants
// to persist lat/lng for the destination (e.g. for the VRP solver), the
// schema needs `trips.location` to point at the `locations` table.
export function AdminUpdateDestination({
  tripId,
  currentAddress,
  onUpdated,
}: AdminUpdateDestinationProps) {
  const mapsConfigured = isGoogleMapsConfigured();

  // Initial pin is a display-only placeholder built from the current address
  // string — its NaN lat/lng make isValidPin() return false, so the submit
  // button stays disabled until the admin actually picks a fresh place from
  // the Google autocomplete dropdown.
  const initialPin: PinSelection | null = currentAddress?.trim()
    ? { address: currentAddress.trim(), latitude: NaN, longitude: NaN }
    : null;
  const [pin, setPin] = useState<PinSelection | null>(initialPin);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const hasCurrentDestination = !!currentAddress?.trim();
  const hasValidPin = isValidPin(pin);
  const hasChanged =
    hasValidPin && pin.address.trim() !== (currentAddress ?? "").trim();
  const canSubmit = mapsConfigured && hasValidPin && hasChanged;
  // Setting a destination for the first time can't reset groups (none exist
  // yet — groups are built from a destination), so skip the warning + confirm
  // step in that case and submit straight through.
  const needsConfirmation = hasCurrentDestination;

  const onConfirmUpdate = async () => {
    if (!isValidPin(pin)) return;
    // Return to whichever state the user was in before submitting. If they
    // came from the amber confirm card (destructive update), errors should
    // re-show that card. If they came from idle (first-time set), errors
    // should show inline below the button without surfacing the confirm card
    // they never opted into.
    const stateOnError: Step = needsConfirmation ? "confirming" : "idle";
    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/trips/update-destination", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          address: pin.address,
          latitude: pin.latitude,
          longitude: pin.longitude,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not update destination"));
        setStep(stateOnError);
        return;
      }

      setStep("idle");
      onUpdated?.();
    } catch {
      setError("Could not reach the server. Try again.");
      setStep(stateOnError);
    }
  };

  const onSubmit = () => {
    if (!canSubmit) {
      setError("Pick a destination from the suggestions");
      return;
    }
    setError(null);
    if (needsConfirmation) {
      setStep("confirming");
    } else {
      void onConfirmUpdate();
    }
  };

  const onCancelConfirm = () => {
    setStep("idle");
    setError(null);
  };

  return (
    <div className={cn(dashboardSectionClass, "flex flex-col gap-4")}>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-atlas-teal">
          <MapPin className="size-5" strokeWidth={2.25} aria-hidden />
          {hasCurrentDestination ? "Update destination" : "Set destination"}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {hasCurrentDestination
            ? "Change where this trip is heading. Any existing driving groups will be reset since they were built around the previous destination."
            : "This trip doesn't have a destination yet. Set one so members can be grouped together."}
        </p>
      </div>

      <label className="flex flex-col gap-1.5" htmlFor="destination-input">
        <span className="text-sm font-medium text-atlas-teal">Destination</span>
        <PlacesAutocompleteInput
          id="destination-input"
          value={pin}
          onChange={(newPin) => {
            setPin(newPin);
            setError(null);
            if (step === "confirming") setStep("idle");
          }}
          disabled={step === "loading"}
          placeholder="Search for a destination…"
          className="w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2 disabled:opacity-60"
        />
      </label>

      {step !== "confirming" && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || step === "loading"}
          className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
        >
          {step === "loading"
            ? "Saving…"
            : hasCurrentDestination
              ? "Update destination"
              : "Set destination"}
        </button>
      )}

      {step === "confirming" && pin && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-900">
            <p className="font-medium">
              Update destination to{" "}
              <span className="font-mono">{pin.address}</span>?
            </p>
            <p className="mt-1.5 text-amber-800">
              This will reset all driving groups for this trip. Members will
              keep their pins but will need to be regrouped.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmUpdate}
              className="flex-1 rounded-xl bg-atlas-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover"
            >
              Yes, update
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step !== "confirming" && error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
