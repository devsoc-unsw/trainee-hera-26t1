import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trip_id: string }> },
) {
  const { trip_id: tripIdParam } = await params;
  const trip_id = tripIdParam || req.nextUrl.searchParams.get("trip_id") || "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: participants, error } = await supabase
    .from("trip_participants")
    .select(
      `
      username,
      is_driver,
      is_admin,
      seats,
      location:locations (
        latitude,
        longitude
      )
    `,
    )
    .eq("trip_id", trip_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (participants ?? []) as any[];

  const participantsWithLocation = rows
    .filter((p) => p && p.location)
    .map((p) => ({
      id: p.username,
      is_driver: p.is_driver,
      seats: p.seats ?? 0,
      latitude: p.location?.latitude as number,
      longitude: p.location?.longitude as number,
    }));

  return NextResponse.json({ participants: participantsWithLocation });
}