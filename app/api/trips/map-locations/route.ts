import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/database";

export type TripMapParticipant = {
  username: string;
  is_driver: boolean;
  is_admin: boolean;
  location: Pick<Location, "id" | "address" | "latitude" | "longitude" | "name"> | null;
};

export async function GET(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id")?.trim() ?? "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: participants, error: participantsError } = await supabase
    .from("trip_participants")
    .select("username, is_driver, is_admin, location")
    .eq("trip_id", trip_id);

  if (participantsError) {
    return NextResponse.json(
      { error: participantsError.message },
      { status: 500 },
    );
  }

  const locationIds = [
    ...new Set(
      (participants ?? [])
        .map((p) => p.location)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const locationsById = new Map<string, Location>();

  if (locationIds.length > 0) {
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, address, latitude, longitude")
      .in("id", locationIds);

    if (locationsError) {
      return NextResponse.json(
        { error: locationsError.message },
        { status: 500 },
      );
    }

    for (const loc of locations ?? []) {
      locationsById.set(loc.id, loc);
    }
  }

  const markers: TripMapParticipant[] = (participants ?? []).map((p) => {
    const loc = p.location ? locationsById.get(p.location) : undefined;
    return {
      username: p.username,
      is_driver: p.is_driver,
      is_admin: p.is_admin,
      location: loc
        ? {
            id: loc.id,
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }
        : null,
    };
  });

  return NextResponse.json({ participants: markers });
}
