import { NextResponse, type NextRequest } from "next/server";
import { getDrivingGroupColor } from "@/lib/driving-group-colors";
import { createClient } from "@/lib/supabase/server";

type DrivingGroupWithParticipants = {
  id: string;
  name: string | null;
  color: string;
  driver: {
    username: string;
    seats: number | null;
  } | null;
  passengers: {
    username: string;
    order: number;
  }[];
};

export async function GET(
  req: NextRequest,
  context: { params?: { trip_id?: string } } = {},
) {
  // Await potentially-promise params
  const resolvedParams = await (context.params as unknown as Promise<any> | any);
  const trip_id = resolvedParams?.trip_id || req.nextUrl.searchParams.get("trip_id") || "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch all groups for this trip
  const { data: groups, error: groupsError } = await supabase
    .from("driving_groups")
    .select("id, name")
    .eq("trip_id", trip_id)
    .order("created_at", { ascending: true });

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  if (!groups || groups.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  // For each group, fetch participants in order
  const groupsWithParticipants: DrivingGroupWithParticipants[] = [];

  for (const [groupIndex, group] of groups.entries()) {
    const { data: participants, error: participantsError } = await supabase
      .from("trip_participants")
      .select("username, is_driver, seats, group_order")
      .eq("group_id", group.id)
      .eq("trip_id", trip_id)
      .order("group_order", { ascending: true });

    if (participantsError) {
      console.error(`Error fetching participants for group ${group.id}:`, participantsError);
      continue;
    }

    const rows = (participants ?? []) as any[];

    // Find driver and passengers
    const driver = rows.find((p) => p.is_driver);
    const passengers = rows.filter((p) => !p.is_driver);

    groupsWithParticipants.push({
      id: group.id,
      name: group.name,
      color: getDrivingGroupColor(groupIndex),
      driver: driver
        ? {
            username: driver.username,
            seats: driver.seats,
          }
        : null,
      passengers: passengers.map((p) => ({
        username: p.username,
        order: p.group_order ?? 0,
      })),
    });
  }

  return NextResponse.json({ groups: groupsWithParticipants });
}
