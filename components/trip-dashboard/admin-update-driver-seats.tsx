"use client";

import { useState } from "react";
import { CarFront } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { AdminDriverSeatsForm } from "@/components/trip-dashboard/admin-driver-seats-form";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { cn } from "@/lib/utils";

type AdminUpdateDriverSeatsProps = {
  tripId: string;
  members: TripMapParticipant[];
  onUpdated?: () => void;
};

export function AdminUpdateDriverSeats({
  tripId,
  members,
  onUpdated,
}: AdminUpdateDriverSeatsProps) {
  const [selectedUsername, setSelectedUsername] = useState("");

  const drivers = members.filter((m) => m.is_driver);
  const selectedDriver = drivers.find((m) => m.username === selectedUsername);

  return (
    <div className={cn(dashboardSectionClass, "flex flex-col gap-4")}>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-atlas-teal">
          <CarFront className="size-5" strokeWidth={2.25} aria-hidden />
          Update driver seats
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Change how many passengers a driver can take.
        </p>
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-slate-500">No drivers on this trip yet.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">Driver</span>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 focus:ring-2"
            >
              <option value="">Select a driver…</option>
              {drivers.map((driver) => (
                <option key={driver.username} value={driver.username}>
                  {driver.username}
                  {typeof driver.seats === "number"
                    ? ` — ${driver.seats} seat${driver.seats === 1 ? "" : "s"}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedDriver && (
            <AdminDriverSeatsForm
              tripId={tripId}
              username={selectedDriver.username}
              initialSeats={selectedDriver.seats}
              onSaved={onUpdated}
            />
          )}
        </>
      )}
    </div>
  );
}
