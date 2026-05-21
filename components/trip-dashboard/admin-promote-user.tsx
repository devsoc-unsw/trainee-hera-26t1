"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { readApiError } from "@/lib/api-error";
import { getTripSession } from "@/lib/trip-session";
import { cn } from "@/lib/utils";

type Step = "idle" | "confirming" | "loading";

type AdminPromoteUserProps = {
  tripId: string;
  members: TripMapParticipant[];
  currentUsername: string;
  onPromoted?: () => void;
};

export function AdminPromoteUser({
  tripId,
  members,
  currentUsername,
  onPromoted,
}: AdminPromoteUserProps) {
  const [selectedUsername, setSelectedUsername] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const promotableMembers = members.filter(
    (m) => !m.is_admin && m.username !== currentUsername,
  );

  const selectedMember = promotableMembers.find(
    (m) => m.username === selectedUsername,
  );

  const onStartPromote = () => {
    if (!selectedMember) {
      setError("Pick a member to promote");
      return;
    }
    setError(null);
    setStep("confirming");
  };

  const onConfirmPromote = async () => {
    if (!selectedMember) return;

    const session = getTripSession();
    if (!session) {
      setError("No active trip session found");
      return;
    }

    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/participants/update-admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          caller_username: session.username,
          target_username: selectedMember.username,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not promote member"));
        setStep("confirming");
        return;
      }

      setSelectedUsername("");
      setStep("idle");
      onPromoted?.();
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
          <Crown className="size-5" strokeWidth={2.25} aria-hidden />
          Make someone an admin
        </h3>
      </div>

      {promotableMembers.length === 0 ? (
        <p className="text-sm text-slate-500">
          Everyone on this trip is already an admin.
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
              {promotableMembers.map((m) => (
                <option key={m.username} value={m.username}>
                  {m.username}
                  {m.is_driver ? " — driver" : " — passenger"}
                </option>
              ))}
            </select>
          </label>

          {step !== "confirming" && (
            <button
              type="button"
              onClick={onStartPromote}
              disabled={!selectedUsername || step === "loading"}
              className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
            >
              Make admin
            </button>
          )}

          {(step === "confirming" || step === "loading") && selectedMember && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Make <span className="font-mono">{selectedMember.username}</span>{" "}
                an admin? They will be able to manage this trip like you.
              </p>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmPromote}
                  disabled={step === "loading"}
                  className="flex-1 rounded-xl bg-atlas-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
                >
                  {step === "loading" ? "Promoting…" : "Yes, make admin"}
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
