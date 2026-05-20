import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LocationInsert } from "@/types/database";

type UpdateDestinationBody = {
  trip_id?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

// TODO(server-auth): this route does not verify the caller is an admin of the
// trip. UI gates it admin-only today. When server-side admin auth lands, add a
// check here against trip_participants.is_admin for the calling user.
export async function PATCH(req: NextRequest) {
  let body: Partial<UpdateDestinationBody>;
  try {
    body = (await req.json()) as Partial<UpdateDestinationBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const latitude =
    typeof body.latitude === "number" && Number.isFinite(body.latitude)
      ? body.latitude
      : null;
  const longitude =
    typeof body.longitude === "number" && Number.isFinite(body.longitude)
      ? body.longitude
      : null;

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 1. Insert the new destination into the `locations` table. We always insert
  //    a fresh row rather than dedupe — Google's formatted_address is not
  //    guaranteed stable enough for an equality match, and we'd rather have a
  //    small amount of orphaned rows than accidentally collide two trips on a
  //    near-miss. A future garbage-collection job can clean orphans up.
  const locationRow: LocationInsert = {
    name: null,
    address,
    latitude,
    longitude,
  };

  const { data: insertedLocation, error: locationError } = await supabase
    .from("locations")
    .insert(locationRow)
    .select("id")
    .single();

  if (locationError) {
    return NextResponse.json(
      { error: locationError.message },
      { status: 500 },
    );
  }

  // 2. Point the trip at the new locations row. This handles both "add" (the
  //    trip previously had no destination) and "update" (it had one) — the
  //    column just stores whichever UUID we put in it.
  const { data: updatedTrip, error: tripError } = await supabase
    .from("trips")
    .update({ location: insertedLocation.id })
    .eq("id", trip_id)
    .select("id, trip_name, trip_date, location, trip_code")
    .maybeSingle();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  // If we got 0 rows back, either (a) the trip really doesn't exist, or
  // (b) RLS blocked the write. Probe with a plain SELECT to tell the two
  // apart so the client gets an actionable error message.
  if (!updatedTrip) {
    const { data: existingTrip } = await supabase
      .from("trips")
      .select("id")
      .eq("id", trip_id)
      .maybeSingle();

    if (existingTrip) {
      return NextResponse.json(
        {
          error:
            "Could not update the trip. The database rejected the write — most likely RLS is missing an UPDATE policy on the trips table. Apply migration 20260520091400_rls_trip_admin_actions.sql.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // 3. Reset driving groups for this trip — destination changed so previous
  //    geography-based groupings are invalid.
  //    Order matters: clear the FK from participants FIRST (otherwise the
  //    DELETE below would fail with a foreign-key violation), then remove the
  //    groups themselves.
  const { error: clearGroupRefError } = await supabase
    .from("trip_participants")
    .update({ group_id: null })
    .eq("trip_id", trip_id);

  if (clearGroupRefError) {
    return NextResponse.json(
      { error: clearGroupRefError.message },
      { status: 500 },
    );
  }

  const { error: deleteGroupsError } = await supabase
    .from("driving_groups")
    .delete()
    .eq("trip_id", trip_id);

  if (deleteGroupsError) {
    return NextResponse.json(
      { error: deleteGroupsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ trip: updatedTrip });
}
