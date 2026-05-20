import { NextResponse, type NextRequest } from "next/server";
import {
  validateDraftLayout,
  type DraftLayout,
} from "@/lib/driving-group-draft";
import type { GroupParticipant } from "@/lib/driving-group-move";
import { createClient } from "@/lib/supabase/server";

type AssignmentUpdate = {
  username: string;
  group_id: string | null;
  group_order: number | null;
};

type ApplyAssignmentsBody = {
  trip_id?: string;
  assignments?: AssignmentUpdate[];
};

export async function PATCH(req: NextRequest) {
  let body: Partial<ApplyAssignmentsBody>;
  try {
    body = (await req.json()) as Partial<ApplyAssignmentsBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const assignments = body.assignments;

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json(
      { error: "assignments is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: groups, error: groupsError } = await supabase
    .from("driving_groups")
    .select("id, name")
    .eq("trip_id", trip_id);

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  const { data: rows, error: fetchError } = await supabase
    .from("trip_participants")
    .select("username, group_id, group_order, is_driver, seats")
    .eq("trip_id", trip_id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const participants = (rows ?? []) as unknown as GroupParticipant[];
  const working = participants.map((p) => ({ ...p }));
  const updateByUser = new Map(assignments.map((a) => [a.username, a]));

  for (const update of assignments) {
    const row = working.find((p) => p.username === update.username);
    if (!row) {
      return NextResponse.json(
        { error: `Participant not found: ${update.username}` },
        { status: 400 },
      );
    }
    if (row.is_driver && update.group_id !== row.group_id) {
      return NextResponse.json(
        { error: "Drivers cannot be moved between groups" },
        { status: 400 },
      );
    }
    row.group_id = update.group_id;
    row.group_order = update.group_order;
  }

  const draftLayout = participantsToLayout(groups ?? [], working);
  const validation = validateDraftLayout(draftLayout);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const updates = working.filter((next) => {
    const prev = participants.find((p) => p.username === next.username);
    return (
      prev?.group_id !== next.group_id || prev?.group_order !== next.group_order
    );
  });

  if (updates.length !== assignments.length) {
    return NextResponse.json(
      { error: "Some assignment updates would not change participant state" },
      { status: 400 },
    );
  }

  for (const update of updates) {
    const requested = updateByUser.get(update.username);
    if (
      !requested ||
      requested.group_id !== update.group_id ||
      requested.group_order !== update.group_order
    ) {
      return NextResponse.json(
        { error: `Invalid assignment for ${update.username}` },
        { status: 400 },
      );
    }
  }

  const results = await Promise.all(
    updates.map((assignment) =>
      supabase
        .from("trip_participants")
        // @ts-expect-error group_order not in generated types yet
        .update({
          group_id: assignment.group_id,
          group_order: assignment.group_order,
        })
        .eq("trip_id", trip_id)
        .eq("username", assignment.username),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: updates.length });
}

function participantsToLayout(
  groups: { id: string; name: string | null }[],
  participants: GroupParticipant[],
): DraftLayout {
  return {
    groups: groups.map((group) => {
      const inGroup = participants.filter((p) => p.group_id === group.id);
      const driver = inGroup.find((p) => p.is_driver);
      const passengers = inGroup
        .filter((p) => !p.is_driver)
        .sort((a, b) => (a.group_order ?? 999) - (b.group_order ?? 999));

      return {
        id: group.id,
        name: group.name,
        color: "",
        driver: driver
          ? { username: driver.username, seats: driver.seats }
          : null,
        passengers: passengers.map((p) => ({
          username: p.username,
          order: p.group_order ?? 0,
        })),
      };
    }),
    unassigned: participants
      .filter((p) => !p.is_driver && p.group_id === null)
      .map((p) => p.username),
  };
}
