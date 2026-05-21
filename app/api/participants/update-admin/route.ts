import { NextResponse, type NextRequest } from "next/server";
import { participantPublicFields } from "@/lib/resolve-trip";
import { createClient } from "@/lib/supabase/server";

type UpdateAdminBody = {
  trip_id?: string;
  caller_username?: string;
  target_username?: string;
};

// TODO(server-auth): verify caller via session/cookie instead of trusting
// caller_username in the body. UI gates admin-only today.
export async function PATCH(req: NextRequest) {
  let body: Partial<UpdateAdminBody>;
  try {
    body = (await req.json()) as Partial<UpdateAdminBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const caller_username =
    typeof body.caller_username === "string"
      ? body.caller_username.trim()
      : "";
  const target_username =
    typeof body.target_username === "string"
      ? body.target_username.trim()
      : "";

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!caller_username) {
    return NextResponse.json(
      { error: "caller_username is required" },
      { status: 400 },
    );
  }
  if (!target_username) {
    return NextResponse.json(
      { error: "target_username is required" },
      { status: 400 },
    );
  }
  if (caller_username === target_username) {
    return NextResponse.json(
      { error: "You cannot change your own admin status here" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: caller, error: callerError } = await supabase
    .from("trip_participants")
    .select("username, is_admin")
    .eq("username", caller_username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (callerError) {
    return NextResponse.json({ error: callerError.message }, { status: 500 });
  }
  if (!caller) {
    return NextResponse.json(
      { error: "Caller is not a participant on this trip" },
      { status: 404 },
    );
  }
  if (!caller.is_admin) {
    return NextResponse.json(
      { error: "Only admins can promote other members" },
      { status: 403 },
    );
  }

  const { data: target, error: targetError } = await supabase
    .from("trip_participants")
    .select("username, is_admin")
    .eq("username", target_username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json(
      { error: "Target user is not a participant on this trip" },
      { status: 404 },
    );
  }
  if (target.is_admin) {
    return NextResponse.json(
      { error: "That member is already an admin" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("trip_participants")
    .update({ is_admin: true })
    .eq("username", target_username)
    .eq("trip_id", trip_id)
    .select(participantPublicFields)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ participant: data });
}
