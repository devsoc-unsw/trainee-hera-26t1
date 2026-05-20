import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DrivingGroupInsert, TripParticipantUpdate } from "@/types/database";

type SaveGroupsBody = {
  trip_id: string;
  routes: string[][];
};

export async function POST(req: Request) {
  const body: SaveGroupsBody = await req.json();
  const { trip_id, routes } = body;

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!routes || !Array.isArray(routes)) {
    return NextResponse.json({ error: "routes are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Validate seat capacity before creating groups
  const totalPassengers = routes.reduce((sum, route) => sum + (route.length - 1), 0);

  const { data: allParticipants, error: fetchError } = await supabase
    .from("trip_participants")
    .select("username, seats, is_driver")
    .eq("trip_id", trip_id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const driverMap = new Map(
    (allParticipants || [])
      .filter((p) => p.is_driver)
      .map((p) => [p.username, p.seats || 0])
  );

  let totalAvailableSeats = 0;
  routes.forEach((route) => {
    const driverId = route[0];
    totalAvailableSeats += driverMap.get(driverId) || 0;
  });

  if (totalAvailableSeats < totalPassengers) {
    return NextResponse.json(
      {
        error: `Insufficient seat capacity. Available: ${totalAvailableSeats}, Passengers: ${totalPassengers}`,
      },
      { status: 422 },
    );
  }

  // Clear old group assignments from all participants
  const { error: clearError } = await supabase
    .from("trip_participants")
    // @ts-ignore
    .update({ group_id: null, group_order: null })
    .eq("trip_id", trip_id);

  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  // Delete old groups for this trip
  const { error: deleteError } = await supabase
    .from("driving_groups")
    .delete()
    .eq("trip_id", trip_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 1. Create driving_groups
  const groupInserts: DrivingGroupInsert[] = routes.map((_, i) => ({
    trip_id,
    name: `Group ${i + 1}`,
  }));

  const { data: groups, error: groupsError } = await supabase
    .from("driving_groups")
    .insert(groupInserts)
    .select("id");

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  if (!groups || groups.length !== routes.length) {
    return NextResponse.json(
      { error: "Failed to create driving groups" },
      { status: 500 },
    );
  }

  // 2. Update trip_participants with group_id and group_order
  const participantUpdates: Promise<any>[] = [];

  routes.forEach((route, groupIndex) => {
    const groupId = groups[groupIndex].id;
    route.forEach((username, orderIndex) => {
      const update: TripParticipantUpdate = {
        group_id: groupId,
        // @ts-ignore - group_order is not in the generated type yet
        group_order: orderIndex,
      };
      participantUpdates.push(
        // @ts-ignore
        supabase
          .from("trip_participants")
          .update(update)
          .eq("trip_id", trip_id)
          .eq("username", username),
      );
    });
  });

  const results = await Promise.all(participantUpdates);

  const errors = results.filter((res) => res.error);
  if (errors.length > 0) {
    // Note: This is not transactional. Some participants might be updated.
    return NextResponse.json(
      { error: `Failed to update some participants: ${errors.map((e) => e.error.message).join(", ")}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, groups_created: groups.length, participants_updated: results.length });
}