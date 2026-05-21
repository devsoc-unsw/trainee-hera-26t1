"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTripSession, clearTripSession } from "@/lib/trip-session";
import { readApiError } from "@/lib/api-error";

type Step = "idle" | "confirming" | "loading" | "success";

type LeaveTripPanelProps = {
  isAdmin?: boolean;
  adminCount?: number;
};

/**
 * Dashboard sidebar panel — lets a participant leave the current trip.
 * Sole admins must promote another member on the People tab before leaving.
 */
export function LeaveTripPanel({
  isAdmin = false,
  adminCount = 0,
}: LeaveTripPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const isSoleAdmin = isAdmin && adminCount <= 1;

  const handleLeave = async () => {
    if (isSoleAdmin) return;

    setStep("loading");
    setError(null);

    const session = getTripSession();
    if (!session) {
      setError("No active trip session found. Please rejoin the trip.");
      setStep("idle");
      return;
    }

    try {
      const res = await fetch("/api/participants/leave-trip", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          trip_id: session.tripId,
        }),
      });

      if (!res.ok) {
        const message = await readApiError(res, "Failed to leave trip");
        setError(message);
        setStep("confirming");
        return;
      }

      clearTripSession();
      setStep("success");

      setTimeout(() => router.push("/"), 1500);
    } catch {
      setError("Network error. Please try again.");
      setStep("confirming");
    }
  };

  if (step === "success") {
    return (
      <div className="flex flex-col gap-2 p-4">
        <p className="text-sm font-medium text-green-600">
          You have left the trip. Redirecting…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Leave Trip</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          You will be removed from this trip and all driving group assignments.
          This cannot be undone.
        </p>
      </div>

      {isSoleAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">You are the only admin</p>
          <p className="mt-1 text-amber-800">
            Promote another member to admin on the{" "}
            <span className="font-semibold">People</span> tab before you can
            leave this trip.
          </p>
        </div>
      )}

      {step === "idle" && !isSoleAdmin && (
        <button
          type="button"
          onClick={() => setStep("confirming")}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          Leave trip
        </button>
      )}

      {step === "confirming" && !isSoleAdmin && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Are you sure you want to leave this trip?
          </p>
          {error && (
            <p className="text-xs font-medium text-red-500">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLeave}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Yes, leave
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setError(null);
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "loading" && !isSoleAdmin && (
        <p className="text-sm text-slate-500">Leaving trip…</p>
      )}
    </div>
  );
}
