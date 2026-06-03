"use client";

import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { MemberGroupAssign } from "@/components/trip-dashboard/member-group-assign";
import { AdminDriverSeatsForm } from "@/components/trip-dashboard/admin-driver-seats-form";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { readApiError } from "@/lib/api-error";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { getTripSession } from "@/lib/trip-session";

const inputClassName =
  "w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

type MemberDetailPopupProps = {
  member: TripMapParticipant;
  isAdmin: boolean;
  tripId: string;
  tripCode?: string;
  onClose: () => void;
  onUpdated?: () => void;
};

export function MemberDetailPopup({
  member,
  isAdmin,
  tripId,
  tripCode,
  onClose,
  onUpdated,
}: MemberDetailPopupProps) {
  const mapsConfigured = isGoogleMapsConfigured();
  const [pin, setPin] = useState<PinSelection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setPin(null);
    setError(null);
    setSuccessMessage(null);
    setIsSaving(false);
    setIsRemoving(false);
  }, [member.username]);

  const address = member.location?.address?.trim();
  const groupLabel =
    member.group_name?.trim() ||
    (member.group_id ? "Assigned group" : null);

  const onSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidPin(pin)) {
      setError("Choose an address from the suggestions");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/participants/update-location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: member.username,
          trip_id: tripId,
          trip_code: tripCode,
          address: pin.address,
          latitude: pin.latitude,
          longitude: pin.longitude,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not save address"));
        return;
      }

      setPin(null);
      setSuccessMessage("Address saved.");
      onUpdated?.();
    } catch {
      setError("Could not save address");
    } finally {
      setIsSaving(false);
    }
  };

  const onRemoveAddress = async () => {
    if (!address) return;

    const session = getTripSession();
    if (!session) {
      setError("No active trip session found");
      return;
    }

    setIsRemoving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/participants/update-location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: member.username,
          trip_id: tripId,
          trip_code: tripCode,
          clear: true,
          caller_username: session.username,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not remove address"));
        return;
      }

      setSuccessMessage("Address removed.");
      onUpdated?.();
    } catch {
      setError("Could not remove address");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className="absolute left-4 top-20 z-20 w-[min(100%,20rem)] rounded-2xl border border-atlas-teal/15 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
      role="dialog"
      aria-labelledby="member-detail-title"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="member-detail-title"
            className="truncate text-base font-semibold text-slate-900"
          >
            {member.username}
          </h2>
          <p className="text-xs text-slate-500">
            {member.is_admin && "Admin · "}
            {member.is_driver
              ? `Driver${typeof member.seats === "number" ? ` · ${member.seats} seats` : ""}`
              : "Passenger"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <dl className="flex flex-col gap-2.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-slate-500">Address</dt>
          <dd className="text-slate-800">{address || "Not set"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Driving group</dt>
          <dd className="flex items-center gap-2 text-slate-800">
            {member.group_color && (
              <span
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: member.group_color }}
                aria-hidden
              />
            )}
            {groupLabel || "Not assigned"}
          </dd>
        </div>
      </dl>

      {isAdmin && !member.is_driver && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-medium text-atlas-teal">
            Change driving group (admin)
          </p>
          <MemberGroupAssign
            member={member}
            tripId={tripId}
            onUpdated={onUpdated}
          />
        </div>
      )}

      {isAdmin && member.is_driver && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-medium text-atlas-teal">
            Update seats (admin)
          </p>
          <AdminDriverSeatsForm
            tripId={tripId}
            username={member.username}
            initialSeats={member.seats}
            onSaved={onUpdated}
            inputClassName={inputClassName}
          />
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-medium text-atlas-teal">
            Update address (admin)
          </p>
          {!mapsConfigured ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-amber-900">
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable address search.
              </p>
              {address && (
                <>
                  {error && (
                    <p className="text-xs text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  {successMessage && (
                    <p className="text-xs text-emerald-600" role="status">
                      {successMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={onRemoveAddress}
                    disabled={isRemoving}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
                  >
                    {isRemoving ? "Removing…" : "Remove address"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={onSaveAddress} className="flex flex-col gap-2">
              <PlacesAutocompleteInput
                id={`admin-pin-${member.username}`}
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setSuccessMessage(null);
                }}
                disabled={isSaving || isRemoving}
                placeholder="Search for a new address…"
                className={inputClassName}
              />
              {error && (
                <p className="text-xs text-red-600" role="alert">
                  {error}
                </p>
              )}
              {successMessage && (
                <p className="text-xs text-emerald-600" role="status">
                  {successMessage}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSaving || isRemoving || !isValidPin(pin)}
                  className="rounded-xl bg-atlas-teal px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
                >
                  {isSaving ? "Saving…" : "Save address"}
                </button>
                {address && (
                  <button
                    type="button"
                    onClick={onRemoveAddress}
                    disabled={isSaving || isRemoving}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-70"
                  >
                    {isRemoving ? "Removing…" : "Remove address"}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
