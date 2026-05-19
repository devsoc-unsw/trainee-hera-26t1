import type { createClient } from "@/lib/supabase/server";
import { validateTripCode } from "@/lib/trip-code";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function resolveTripId(
  supabase: Supabase,
  tripId: string,
  tripCode: string,
): Promise<{ tripId: string } | { error: string; status: number }> {
  if (tripId) {
    return { tripId };
  }

  if (!tripCode) {
    return {
      error: "trip_id or trip_code is required",
      status: 400,
    };
  }

  const tripCodeError = validateTripCode(tripCode);
  if (tripCodeError) {
    return { error: tripCodeError, status: 400 };
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("trip_code", tripCode)
    .single();

  if (tripError || !trip) {
    return { error: "Trip not found", status: 404 };
  }

  return { tripId: trip.id };
}

export const participantPublicFields =
  "username, trip_id, group_id, location, is_driver, is_admin, seats" as const;
