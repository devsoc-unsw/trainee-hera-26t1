"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { readApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type Step = "idle" | "confirming" | "loading";

type AdminRemoveUserProps = {
  tripId: string;
  members: TripMapParticipant[];
  currentUsername: string;
  onRemoved?: () => void;
};

// TODO(server-auth): the underlying DELETE /api/participants/leave-trip has no
// admin check — UI-only gating today. The route does have a safety check that
// prevents removing the sole admin. When server-side admin authorization lands,
// this form should call a dedicated /admin-remove route that verifies the
// caller is is_admin === true for the trip.
export function AdminRemoveUser({
  tripId,
  members,
  currentUsername,
  onRemoved,
}: AdminRemoveUserProps) {
  const [selectedUsername, setSelectedUsername] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  // Admins shouldn't remove themselves from here — they should use the Leave
  // trip panel on the Personal tab.
  const removableMembers = members.filter(
    (m) => m.username !== currentUsername,
  );

  const selectedMember = removableMembers.find(
    (m) => m.username === selectedUsername,
  );

  const onStartRemove = () => {
    if (!selectedMember) {
      setError("Pick a member to remove");
      return;
    }
    setError(null);
    setStep("confirming");
  };

  const onConfirmRemove = async () => {
    if (!selectedMember) return;

    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/participants/leave-trip", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: selectedMember.username,
          trip_id: tripId,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not remove member"));
        setStep("confirming");
        return;
      }

      setSelectedUsername("");
      setStep("idle");
      onRemoved?.();
    } catch {
      setError("Could not reach the server. Try again.");
      setStep("confirming");
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
          <UserMinus className="size-5" strokeWidth={2.25} aria-hidden />
          Remove a member
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Pick someone to take off this trip. This can&apos;t be undone — they
          can rejoin with the trip code.
        </p>
      </div>

      {removableMembers.length === 0 ? (
        <p className="text-sm text-slate-500">
          You&apos;re the only member on this trip.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">Member</span>
            <select
              value={selectedUsername}
              onChange={(e) => {
                setSelectedUsername(e.target.value);
                setError(null);
                if (step === "confirming") setStep("idle");
              }}
              disabled={step === "loading"}
              className="rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 focus:ring-2 disabled:opacity-60"
            >
              <option value="">Select a member…</option>
              {removableMembers.map((m) => (
                <option key={m.username} value={m.username}>
                  {m.username}
                  {m.is_admin ? " (admin)" : ""}
                  {m.is_driver ? " — driver" : ""}
                </option>
              ))}
            </select>
          </label>

          {step !== "confirming" && (
            <button
              type="button"
              onClick={onStartRemove}
              disabled={!selectedUsername || step === "loading"}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              Remove from trip
            </button>
          )}

          {(step === "confirming" || step === "loading") && selectedMember && (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                Remove{" "}
                <span className="font-mono">{selectedMember.username}</span>{" "}
                from this trip?
              </p>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmRemove}
                  disabled={step === "loading"}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {step === "loading" ? "Removing…" : "Yes, remove"}
                </button>
                <button
                  type="button"
                  onClick={onCancelConfirm}
                  disabled={step === "loading"}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
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
        </>
      )}
    </div>
  );
}
