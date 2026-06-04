import { NextResponse, type NextRequest } from "next/server";
import { MAX_PASSENGER_SEATS } from "@/lib/participant-seats";
import { createClient } from "@/lib/supabase/server";
import type { TripParticipantUpdate } from "@/types/database";

type UpdateRoleBody = {
  username?: string;
  trip_id?: string;
  is_driver?: boolean;
  caller_username?: string;
  seats?: number;
};

export async function PATCH(req: NextRequest) {
  let body: Partial<UpdateRoleBody>;
  try {
    body = (await req.json()) as Partial<UpdateRoleBody>;
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
  if (typeof body.is_driver !== "boolean") {
    return NextResponse.json({ error: "is_driver is required" }, { status: 400 });
  }

  const supabase = await createClient();

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
        { error: "Only admins can change another member's role" },
        { status: 403 },
      );
    }
  }

  let update: TripParticipantUpdate;
  if (body.is_driver) {
    update = { is_driver: true };
    if (typeof body.seats === "number") {
      if (!Number.isInteger(body.seats)) {
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
      update.seats = body.seats;
    }
  } else {
    update = { is_driver: false, seats: null };
  }

  const { data, error } = await supabase
    .from("trip_participants")
    .update(update)
    .eq("username", username)
    .eq("trip_id", trip_id)
    .select(
      "username, trip_id, group_id, location, is_driver, is_admin, seats",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ participant: data });
}
