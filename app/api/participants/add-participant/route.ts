import { NextResponse, type NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";
import { validateTripCode } from "@/lib/trip-code";
import type { TripParticipantInsert } from "@/types/database";

type AddParticipantBody = {
  username?: string;
  trip_id?: string;
  trip_code?: string;
  password?: string;
  is_driver?: boolean;
  is_admin?: boolean;
  seats?: number;
  group_id?: string;
  location?: string;
};

export async function POST(req: NextRequest) {
  let body: Partial<AddParticipantBody>;
  try {
    body = (await req.json()) as Partial<AddParticipantBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const tripId =
    typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const tripCode =
    typeof body.trip_code === "string" ? body.trip_code.trim() : "";

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const password =
    typeof body.password === "string" ? body.password.trim() : "";
  if (!password) {
    return NextResponse.json(
      { error: "password is required for this username" },
      { status: 400 },
    );
  }

  if (!tripId && !tripCode) {
    return NextResponse.json(
      { error: "trip_id or trip_code is required" },
      { status: 400 },
    );
  }

  if (!tripId && tripCode) {
    const tripCodeError = validateTripCode(tripCode);
    if (tripCodeError) {
      return NextResponse.json({ error: tripCodeError }, { status: 400 });
    }
  }

  const supabase = await createClient();

  let resolvedTripId = tripId;
  if (!resolvedTripId) {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .eq("trip_code", tripCode)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    resolvedTripId = trip.id;
  }

  const password_hash = await hashPassword(password);

  const row: TripParticipantInsert = {
    username,
    trip_id: resolvedTripId,
    password_hash,
    is_driver: body.is_driver === true,
    is_admin: body.is_admin === true,
    group_id:
      typeof body.group_id === "string" && body.group_id.trim()
        ? body.group_id.trim()
        : null,
    location:
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : null,
    seats: typeof body.seats === "number" ? body.seats : null,
  };

  const { data, error } = await supabase
    .from("trip_participants")
    .insert(row)
    .select(
      "username, trip_id, group_id, location, is_driver, is_admin, seats",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "This username is already on this trip. Sign in with your password instead.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ participant: data }, { status: 201 });
}
