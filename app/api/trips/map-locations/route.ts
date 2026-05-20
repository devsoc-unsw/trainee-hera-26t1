import { NextResponse, type NextRequest } from "next/server";
import { buildGroupColorById } from "@/lib/driving-group-colors";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/types/database";

export type TripMapLocation = Pick<
  Location,
  "id" | "address" | "latitude" | "longitude" | "name"
>;

export type TripMapParticipant = {
  username: string;
  is_driver: boolean;
  is_admin: boolean;
  seats: number | null;
  group_id: string | null;
  group_name: string | null;
  group_color: string | null;
  location: TripMapLocation | null;
};

export async function GET(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get("trip_id")?.trim() ?? "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .select("location")
    .eq("id", trip_id)
    .maybeSingle();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  const [{ data: participants, error: participantsError }, { data: groups }] =
    await Promise.all([
      supabase
        .from("trip_participants")
        .select("username, is_driver, is_admin, seats, location, group_id")
        .eq("trip_id", trip_id),
      supabase
        .from("driving_groups")
        .select("id, name")
        .eq("trip_id", trip_id)
        .order("created_at", { ascending: true }),
    ]);

  if (participantsError) {
    return NextResponse.json(
      { error: participantsError.message },
      { status: 500 },
    );
  }

  const tripDestinationId =
    typeof tripRow?.location === "string" && tripRow.location.length > 0
      ? tripRow.location
      : null;

  const locationIds = [
    ...new Set(
      [
        ...(participants ?? []).map((p) => p.location),
        tripDestinationId,
      ].filter((id): id is string => typeof id === "string" && id.length > 0),
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

  const toMapLocation = (id: string | null): TripMapLocation | null => {
    if (!id) return null;
    const loc = locationsById.get(id);
    if (!loc) return null;
    return {
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
  };

  const groupColorById = buildGroupColorById(groups ?? []);
  const groupNameById = new Map(
    (groups ?? []).map((g) => [g.id, g.name as string | null]),
  );

  const markers: TripMapParticipant[] = (participants ?? []).map((p) => {
    const groupId =
      typeof p.group_id === "string" && p.group_id.length > 0
        ? p.group_id
        : null;
    return {
      username: p.username,
      is_driver: p.is_driver,
      is_admin: p.is_admin,
      seats: typeof p.seats === "number" ? p.seats : null,
      group_id: groupId,
      group_name: groupId ? (groupNameById.get(groupId) ?? null) : null,
      group_color: groupId ? (groupColorById[groupId] ?? null) : null,
      location: toMapLocation(p.location),
    };
  });

  const destination = toMapLocation(tripDestinationId);

  return NextResponse.json({ participants: markers, destination });
}
