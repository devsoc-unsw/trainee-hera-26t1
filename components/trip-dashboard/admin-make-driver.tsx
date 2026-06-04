"use client";

import { useState } from "react";
import { Car } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { AdminMakeDriverForm } from "@/components/trip-dashboard/admin-make-driver-form";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { cn } from "@/lib/utils";

type AdminMakeDriverProps = {
  tripId: string;
  members: TripMapParticipant[];
  onUpdated?: () => void;
};

export function AdminMakeDriver({
  tripId,
  members,
  onUpdated,
}: AdminMakeDriverProps) {
  const [selectedUsername, setSelectedUsername] = useState("");

  const passengers = members.filter((m) => !m.is_driver);
  const selectedPassenger = passengers.find(
    (m) => m.username === selectedUsername,
  );

  return (
    <div className={cn(dashboardSectionClass, "flex flex-col gap-4")}>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-atlas-teal">
          <Car className="size-5" strokeWidth={2.25} aria-hidden />
          Make someone a driver
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Change a passenger to a driver and set their seat capacity.
        </p>
      </div>

      {passengers.length === 0 ? (
        <p className="text-sm text-slate-500">
          Everyone on this trip is already a driver.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">Passenger</span>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 focus:ring-2"
            >
              <option value="">Select a passenger…</option>
              {passengers.map((member) => (
                <option key={member.username} value={member.username}>
                  {member.username}
                </option>
              ))}
            </select>
          </label>

          {selectedPassenger && (
            <AdminMakeDriverForm
              tripId={tripId}
              username={selectedPassenger.username}
              onSaved={() => {
                setSelectedUsername("");
                onUpdated?.();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
