"use client";

import { useState } from "react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardSectionHeading } from "@/components/trip-dashboard/dashboard-ui";
import { DrivingGroupsEditor } from "@/components/trip-dashboard/driving-groups-editor";
import { hasMapCoords } from "@/components/trip-dashboard/member-utils";
import type { TripSummary } from "@/components/trip-dashboard/use-trip-dashboard-data";
import type { DraftLayout } from "@/lib/driving-group-draft";
import { SOLVER_CAPACITY_ERROR_MESSAGE } from "@/lib/solver-error";
import { getTripSession } from "@/lib/trip-session";

type TripDestination = TripSummary["destination"];

type ParticipantLocation = {
  id: string;
  is_driver: boolean;
  seats: number;
  latitude: number;
  longitude: number;
};

type DrivingGroupsPanelProps = {
  tripId: string;
  destination?: TripDestination | null;
  isAdmin?: boolean;
  layout: DraftLayout | null;
  layoutVersion: number;
  groupsLoading: boolean;
  onGroupsRefresh: () => Promise<void>;
  onGroupsFormed?: () => void;
};

export function DrivingGroupsPanel({
  tripId,
  destination = null,
  isAdmin = false,
  layout,
  layoutVersion,
  groupsLoading,
  onGroupsRefresh,
  onGroupsFormed,
}: DrivingGroupsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasDestination = hasMapCoords(destination);

  async function handleFormGroups() {
    setLoading(true);
    setMessage(null);

    const session = getTripSession();
    if (!session) {
      setMessage("No trip session found");
      setLoading(false);
      return;
    }

    const currentTripId = session.tripId;

    try {
      const tripParams = new URLSearchParams({ trip_id: currentTripId });
      const tripRes = await fetch(`/api/trips/by-id?${tripParams}`);
      const tripJson = (await tripRes.json()) as {
        trip?: TripSummary;
        error?: string;
      };
      if (!tripRes.ok) {
        throw new Error(tripJson.error || "Failed to fetch trip");
      }

      const destination = tripJson.trip?.destination ?? null;
      if (!hasMapCoords(destination)) {
        setMessage(
          "Can't form groups — set a trip destination first (Trip info tab).",
        );
        setLoading(false);
        return;
      }

      const pRes = await fetch(
        `/api/trips/${encodeURIComponent(currentTripId)}/participants`,
      );
      const pData = await pRes.json();
      if (!pRes.ok) {
        throw new Error(pData.error || "Failed to fetch participants");
      }

      const participants: ParticipantLocation[] = pData.participants || [];
      if (!participants.length) {
        setMessage("No participants with locations found");
        setLoading(false);
        return;
      }

      const locations = participants.map((p) => ({
        id: p.id,
        is_driver: !!p.is_driver,
        seats: typeof p.seats === "number" ? p.seats : 0,
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      const solveRes = await fetch("/api/solve-roadtrip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations,
          destination: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        }),
      });
      const solveData = await solveRes.json();
      if (!solveRes.ok) throw new Error(SOLVER_CAPACITY_ERROR_MESSAGE);

      const routes: string[][] = solveData.routes;

      const saveRes = await fetch(`/api/driving-groups/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: currentTripId, routes }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save groups");
      }

      setMessage(`Success: created ${saveData.groups_created} groups`);
      await onGroupsRefresh();
      onGroupsFormed?.();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={dashboardSectionClass}>
      <DashboardSectionHeading title="Driving groups" className="mb-2" />
      {isAdmin && (
        <div className="mb-2.5 flex flex-col items-center gap-2 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={handleFormGroups}
            disabled={loading || !hasDestination}
            className="rounded-2xl bg-atlas-teal px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
          >
            {loading ? "Forming…" : "Form groups"}
          </button>
          {!hasDestination && (
            <p className="max-w-sm text-sm text-red-600" role="alert">
              Set a trip destination on the Trip info tab before forming groups.
            </p>
          )}
          {message && (
            <p
              className={`max-w-sm text-sm ${
                message.startsWith("Success:")
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
              role="alert"
            >
              {message}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DrivingGroupsEditor
          tripId={tripId}
          isAdmin={isAdmin}
          layout={layout}
          layoutVersion={layoutVersion}
          loading={groupsLoading}
          onRefresh={onGroupsRefresh}
          onChanged={onGroupsFormed}
        />
      </div>
    </div>
  );
}
