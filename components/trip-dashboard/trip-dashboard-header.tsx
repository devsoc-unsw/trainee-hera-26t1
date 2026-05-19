import { Loader2 } from "lucide-react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import type { TripSummary } from "@/components/trip-dashboard/use-trip-dashboard-data";
import { cn } from "@/lib/utils";
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
  if (isLoading) {
    return (
      <div className={cn(dashboardSectionClass, "p-6")}>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading trip…
        </div>
      </div>
    );
  }

  return (
    <div className={cn(dashboardSectionClass, "p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-atlas-teal/70">
            Current trip
          </p>
          <h2 className="mt-1.5 truncate text-[1.625rem] font-semibold leading-tight tracking-tight text-atlas-teal">
            {trip?.trip_name ?? "Your trip"}
          </h2>
        </div>

        {trip?.trip_code && (
          <div className="shrink-0 rounded-2xl border border-atlas-teal/15 bg-atlas-mist/50 px-3.5 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-atlas-teal/70">
              Code
            </p>
            <p className="mt-0.5 font-mono text-base font-semibold tracking-wider text-atlas-teal">
              {trip.trip_code}
            </p>
          </div>
        )}
      </div>

      {me && (
        <div className="mt-5 flex items-center gap-3 border-t border-atlas-teal/10 pt-4">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-atlas-teal text-base font-semibold text-white"
            aria-hidden
          >
            {me.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-atlas-teal">
              {me.username}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
