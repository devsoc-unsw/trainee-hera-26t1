import { MapPin } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { AdminRemoveUser } from "@/components/trip-dashboard/admin-remove-user";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardSectionHeading } from "@/components/trip-dashboard/dashboard-ui";
import type { TripSummary } from "@/components/trip-dashboard/use-trip-dashboard-data";
import type { TripParticipant } from "@/types/database";

type TripInfoPanelProps = {
  trip: TripSummary | null;
  me: TripParticipant | null;
  members: TripMapParticipant[];
  isLoading: boolean;
  memberCount: number;
  onMemberRemoved?: () => void;
};

export function TripInfoPanel({
  trip,
  me,
  members,
  isLoading,
  memberCount,
  onMemberRemoved,
}: TripInfoPanelProps) {
  // Only show the loading state on the FIRST load (when we don't have trip
  // data yet). Once we've loaded once, subsequent refreshes shouldn't unmount
  // the admin remove panel below.
  if (isLoading && !trip) {
    return (
      <div className={dashboardSectionClass}>
        <p className="text-sm text-slate-500">Loading trip details…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${dashboardSectionClass} flex flex-col gap-4`}>
        <DashboardSectionHeading
          title="Trip information"
          description="Overview of this trip for all participants."
        />
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex gap-3">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-atlas-teal"
              aria-hidden
            />
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Destination
              </dt>
              <dd className="font-medium text-slate-800">
                {trip?.location?.trim() || "Not set"}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Date</dt>
            <dd className="font-medium text-slate-800">
              {trip?.trip_date
                ? new Date(trip.trip_date).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Invite code</dt>
            <dd className="font-mono font-medium text-atlas-teal">
              {trip?.trip_code ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Participants</dt>
            <dd className="font-medium text-slate-800">{memberCount}</dd>
          </div>
        </dl>
      </div>

      {me?.is_admin && trip?.id && (
        <AdminRemoveUser
          tripId={trip.id}
          members={members}
          currentUsername={me.username}
          onRemoved={onMemberRemoved}
        />
      )}
    </div>
  );
}
