import { NextResponse, type NextRequest } from "next/server";
import {
  planMemberMove,
  type GroupParticipant,
} from "@/lib/driving-group-move";
import { createClient } from "@/lib/supabase/server";

type MoveMemberBody = {
  trip_id?: string;
  username?: string;
  to_group_id?: string | null;
  swap_with_username?: string;
};

export async function PATCH(req: NextRequest) {
  let body: Partial<MoveMemberBody>;
  try {
    body = (await req.json()) as Partial<MoveMemberBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const username =
    typeof body.username === "string" ? body.username.trim() : "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const to_group_id =
    body.to_group_id === null
      ? null
      : typeof body.to_group_id === "string" && body.to_group_id.trim()
        ? body.to_group_id.trim()
        : body.to_group_id === undefined
          ? undefined
          : null;

  if (to_group_id === undefined) {
    return NextResponse.json(
      { error: "to_group_id is required (use null to unassign)" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("trip_participants")
    .select("username, group_id, group_order, is_driver, seats")
    .eq("trip_id", trip_id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const participants = (rows ?? []) as GroupParticipant[];

  const planned = planMemberMove(participants, {
    username,
    to_group_id,
    swap_with_username: body.swap_with_username,
  });

  if (!planned.ok) {
    return NextResponse.json(
      { error: planned.error, code: planned.code },
      { status: planned.code === "group_full" ? 422 : 400 },
    );
  }

  const updates = planned.assignments.filter((next) => {
    const prev = participants.find((p) => p.username === next.username);
    return (
      prev?.group_id !== next.group_id || prev?.group_order !== next.group_order
    );
  });

  const results = await Promise.all(
    updates.map((assignment) =>
      supabase
        .from("trip_participants")
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
