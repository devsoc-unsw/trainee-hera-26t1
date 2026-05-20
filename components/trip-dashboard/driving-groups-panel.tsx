"use client";

import { useState, useEffect } from "react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardSectionHeading } from "@/components/trip-dashboard/dashboard-ui";
import { Button } from "@/components/ui/button";
import { getTripSession } from "@/lib/trip-session";

type ParticipantLocation = {
  id: string;
  is_driver: boolean;
  seats: number;
  latitude: number;
  longitude: number;
};

type DrivingGroup = {
  id: string;
  name: string | null;
  color: string;
  driver: {
    username: string;
    seats: number | null;
  } | null;
  passengers: {
    username: string;
    order: number;
  }[];
};

export function DrivingGroupsPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [groups, setGroups] = useState<DrivingGroup[]>([]);

  useEffect(() => {
    const session = getTripSession();
    if (!session) return;

    const { username, tripId } = session;

    // Check participant role
    fetch(`/api/participants/me?username=${encodeURIComponent(username)}&trip_id=${encodeURIComponent(tripId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.participant?.is_admin) setIsAdmin(true);
      })
      .catch(() => {
        // ignore
      });

    // Fetch initial groups
    fetchGroups(tripId);
  }, []);

  async function fetchGroups(tripId: string) {
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/driving-groups`);
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleFormGroups() {
    setLoading(true);
    setMessage(null);

    const session = getTripSession();
    if (!session) {
      setMessage("No trip session found");
      setLoading(false);
      return;
    }

    const tripId = session.tripId;

    try {
      // 1) Fetch participants with locations for this trip
      const pRes = await fetch(`/api/trips/${encodeURIComponent(tripId)}/participants`);
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || "Failed to fetch participants");

      const participants: ParticipantLocation[] = pData.participants || [];
      if (!participants.length) {
        setMessage("No participants with locations found");
        setLoading(false);
        return;
      }

      // 2) Build solver payload
      const locations = participants.map((p) => ({
        id: p.id,
        is_driver: !!p.is_driver,
        seats: typeof p.seats === "number" ? p.seats : 0,
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      // 3) Call solver via app route
      const solveRes = await fetch("/api/solve-roadtrip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
      });
      const solveData = await solveRes.json();
      if (!solveRes.ok) throw new Error(solveData.error || "Solver error");

      const routes: string[][] = solveData.routes;

      // 4) Save groups to DB
      const saveRes = await fetch(`/api/driving-groups/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: tripId, routes }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save groups");

      setMessage(`Success: created ${saveData.groups_created} groups`);
      
      // Refresh groups list
      await fetchGroups(tripId);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={dashboardSectionClass}>
      <DashboardSectionHeading title="Driving groups" />
      {isAdmin && (
        <div className="mb-3 flex items-center gap-3">
          <Button onClick={handleFormGroups} disabled={loading}>
            {loading ? "Forming…" : "Form groups"}
          </Button>
          {message && (
            <p
              className={`text-xs ${
                message.startsWith("Success:")
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {message.startsWith("Success:") ? "success" : `error: ${message}`}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        {groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                style={{ borderLeftWidth: 4, borderLeftColor: group.color }}
              >
                <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <span
                    className="inline-block size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                    aria-hidden
                  />
                  {group.name || `Group ${group.id.slice(0, 8)}`}
                </h3>

                <ol className="mt-1 space-y-1 text-sm text-slate-600">
                  {group.driver && (
                    <li>
                      1. {group.driver.username} <span className="text-slate-400">(driver)</span>
                    </li>
                  )}
                  {group.passengers.map((p, index) => (
                    <li key={p.username}>
                      {group.driver ? index + 2 : index + 1}. {p.username}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No groups yet.</p>
        )}
      </div>
    </div>
  );
}
