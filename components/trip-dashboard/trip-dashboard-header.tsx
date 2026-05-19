import { Loader2 } from "lucide-react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import type { TripSummary } from "@/components/trip-dashboard/use-trip-dashboard-data";
import type { TripParticipant } from "@/types/database";

type TripDashboardHeaderProps = {
  trip: TripSummary | null;
  me: TripParticipant | null;
  isLoading: boolean;
};

export function TripDashboardHeader({
  trip,
  me,
  isLoading,
}: TripDashboardHeaderProps) {
  return (
    <div className={dashboardSectionClass}>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading trip…
        </div>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-atlas-teal/80">
            Current trip
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-atlas-teal">
            {trip?.trip_name ?? "Your trip"}
          </h2>
          {trip?.trip_code && (
            <p className="mt-1 font-mono text-xs text-slate-500">
              Code {trip.trip_code}
            </p>
          )}
          {me && (
            <p className="mt-2 text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-medium text-slate-800">{me.username}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
