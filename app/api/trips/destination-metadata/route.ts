import { NextResponse, type NextRequest } from "next/server";
import { normalizeAirbnbUrl } from "@/lib/airbnb-url";
import { createClient } from "@/lib/supabase/server";

type DestinationMetadataBody = {
  trip_id?: string;
  location_id?: string;
  airbnb_url?: string | null;
};

// TODO(server-auth): verify caller is trip admin (same as update-destination).
export async function PATCH(req: NextRequest) {
  let body: Partial<DestinationMetadataBody>;
  try {
    body = (await req.json()) as Partial<DestinationMetadataBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const location_id =
    typeof body.location_id === "string" ? body.location_id.trim() : "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!location_id) {
    return NextResponse.json(
      { error: "location_id is required" },
      { status: 400 },
    );
  }

  if (!("airbnb_url" in body)) {
    return NextResponse.json(
      { error: "airbnb_url is required in body (use null to clear)" },
      { status: 400 },
    );
  }

  const airbnb_url =
    body.airbnb_url === null || body.airbnb_url === ""
      ? null
      : normalizeAirbnbUrl(body.airbnb_url);

  if (body.airbnb_url != null && body.airbnb_url !== "" && airbnb_url === null) {
    return NextResponse.json(
      { error: "Invalid Airbnb URL. Use a https://airbnb.com/... link." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("location")
    .eq("id", trip_id)
    .maybeSingle();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  if (trip.location !== location_id) {
    return NextResponse.json(
      { error: "location_id does not match this trip's destination" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("locations")
    .update({ airbnb_url })
    .eq("id", location_id)
    .select("id, name, address, latitude, longitude, airbnb_url")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({ destination: updated });
}
