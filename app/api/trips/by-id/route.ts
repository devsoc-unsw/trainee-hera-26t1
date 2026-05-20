import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id")?.trim() ?? "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // We alias the nested locations row as `destination` so consumers don't
  // have to disambiguate between `trip.location` (the UUID FK) and the
  // resolved place. The UUID is kept too so other features that need to
  // pass it back (e.g. updating the destination, group-solver inputs) still
  // have access to it without a second fetch.
  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "id, trip_name, trip_date, location, trip_code, destination:locations(id, name, address, latitude, longitude)",
    )
    .eq("id", trip_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({ trip });
}
