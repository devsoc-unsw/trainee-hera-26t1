import { NextResponse, type NextRequest } from "next/server";
import { toDestinationImageViews } from "@/lib/destination-images";
import { createClient } from "@/lib/supabase/server";

type RawLocationImage = {
  id: string;
  storage_path: string;
  sort_order: number;
};

type RawDestination = {
  id: string;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  airbnb_url: string | null;
  images?: RawLocationImage[] | null;
};

export async function GET(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id")?.trim() ?? "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, trip_name, trip_date, location, trip_code, destination:locations(id, name, address, latitude, longitude, airbnb_url, images:location_images(id, storage_path, sort_order))",
    )
    .eq("id", trip_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const raw = data as {
    id: string;
    trip_name: string;
    trip_date: string | null;
    location: string | null;
    trip_code: string;
    destination: RawDestination | null;
  };

  const destination = raw.destination
    ? {
        id: raw.destination.id,
        name: raw.destination.name,
        address: raw.destination.address,
        latitude: raw.destination.latitude,
        longitude: raw.destination.longitude,
        airbnb_url: raw.destination.airbnb_url,
        images: toDestinationImageViews(raw.destination.images),
      }
    : null;

  return NextResponse.json({
    trip: {
      id: raw.id,
      trip_name: raw.trip_name,
      trip_date: raw.trip_date,
      location: raw.location,
      trip_code: raw.trip_code,
      destination,
    },
  });
}
