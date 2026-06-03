import { NextResponse, type NextRequest } from "next/server";
import { MAX_PASSENGER_SEATS } from "@/lib/participant-seats";
import { createClient } from "@/lib/supabase/server";

type UpdateSeatsBody = {
  username?: string;
  trip_id?: string;
  seats?: number;
  caller_username?: string;
};

export async function PATCH(req: NextRequest) {
  let body: Partial<UpdateSeatsBody>;
  try {
    body = (await req.json()) as Partial<UpdateSeatsBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const caller_username =
    typeof body.caller_username === "string"
      ? body.caller_username.trim()
      : "";

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (typeof body.seats !== "number" || !Number.isInteger(body.seats)) {
    return NextResponse.json(
      { error: "seats must be a whole number" },
      { status: 400 },
    );
  }
  if (body.seats < 0 || body.seats > MAX_PASSENGER_SEATS) {
    return NextResponse.json(
      { error: `seats must be between 0 and ${MAX_PASSENGER_SEATS}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("trip_participants")
    .select("is_driver")
    .eq("username", username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  if (!existing.is_driver) {
    return NextResponse.json(
      { error: "Only drivers can have passenger seats" },
      { status: 400 },
    );
  }

  if (caller_username && caller_username !== username) {
    const { data: caller, error: callerError } = await supabase
      .from("trip_participants")
      .select("is_admin")
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
        { error: "Only admins can update another member's seats" },
        { status: 403 },
      );
    }
  }

  const { data, error } = await supabase
    .from("trip_participants")
    .update({ seats: body.seats })
    .eq("username", username)
    .eq("trip_id", trip_id)
    .select(
      "username, trip_id, group_id, location, is_driver, is_admin, seats",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ participant: data });
}
