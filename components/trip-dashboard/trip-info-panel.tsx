import { ExternalLink, MapPin } from "lucide-react";
import { AdminUpdateDestination } from "@/components/trip-dashboard/admin-update-destination";
import { DestinationImageGallery } from "@/components/trip-dashboard/destination-image-gallery";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardSectionHeading } from "@/components/trip-dashboard/dashboard-ui";
import { hasMapCoords } from "@/components/trip-dashboard/member-utils";
import type { TripSummary } from "@/components/trip-dashboard/use-trip-dashboard-data";
import type { TripParticipant } from "@/types/database";

type TripInfoPanelProps = {
  trip: TripSummary | null;
  me: TripParticipant | null;
  isLoading: boolean;
  memberCount: number;
  onTripUpdated?: () => void;
  onDestinationFocus?: () => void;
};

export function TripInfoPanel({
  trip,
  me,
  isLoading,
  memberCount,
  onTripUpdated,
  onDestinationFocus,
}: TripInfoPanelProps) {
  const destinationAddress = trip?.destination?.address?.trim();
  const airbnbUrl = trip?.destination?.airbnb_url?.trim();
  const destinationImages = trip?.destination?.images ?? [];
  const canShowDestinationOnMap =
    !!destinationAddress &&
    hasMapCoords(trip?.destination) &&
    !!onDestinationFocus;
  // Only show the loading state on the FIRST load (when we don't have trip
  // data yet). Once we've loaded once, subsequent refreshes shouldn't unmount
  // the admin panel below — that would wipe its form state.
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
                {canShowDestinationOnMap ? (
                  <button
                    type="button"
                    onClick={onDestinationFocus}
                    className="text-left text-atlas-teal underline decoration-atlas-teal/30 underline-offset-2 transition-colors hover:text-atlas-teal-hover hover:decoration-atlas-teal/60"
                    aria-label={`Show destination on map: ${destinationAddress}`}
                  >
                    {destinationAddress}
                  </button>
                ) : (
                  destinationAddress || "Not set"
                )}
              </dd>
              {airbnbUrl && (
                <dd className="mt-1.5">
                  <a
                    href={airbnbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-atlas-teal underline decoration-atlas-teal/30 underline-offset-2 hover:text-atlas-teal-hover"
                  >
                    View on Airbnb
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </dd>
              )}
              {destinationImages.length > 0 && (
                <dd className="mt-2">
                  <DestinationImageGallery images={destinationImages} />
                </dd>
              )}
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
        <AdminUpdateDestination
          tripId={trip.id}
          currentAddress={trip.destination?.address ?? null}
          currentLocationId={trip.destination?.id ?? null}
          currentAirbnbUrl={trip.destination?.airbnb_url ?? null}
          currentImages={trip.destination?.images ?? []}
          onUpdated={onTripUpdated}
        />
      )}
    </div>
  );
}
