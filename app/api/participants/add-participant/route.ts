import { NextResponse, type NextRequest } from "next/server";
import { createLocationRow } from "@/lib/create-location";
import { hashPassword } from "@/lib/password";
import {
  participantPublicFields,
  resolveTripId,
} from "@/lib/resolve-trip";
import { createClient } from "@/lib/supabase/server";
import type { TripParticipantInsert } from "@/types/database";

const MAX_SEATS = 15;

type AddParticipantBody = {
  username?: string;
  trip_id?: string;
  trip_code?: string;
  password?: string;
  is_driver?: boolean;
  is_admin?: boolean;
  seats?: number;
  group_id?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
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
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const password =
    typeof body.password === "string" ? body.password.trim() : "";
  const password_hash = password ? await hashPassword(password) : null;

  const supabase = await createClient();
  const resolved = await resolveTripId(supabase, tripId, tripCode);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const { data: existing } = await supabase
    .from("trip_participants")
    .select("username, password_hash")
    .eq("username", username)
    .eq("trip_id", resolved.tripId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error:
          "This username is already on this trip. Log in with your password instead.",
        code: "username_exists",
        has_password: Boolean(existing.password_hash),
      },
      { status: 409 },
    );
  }

  const address =
    typeof body.address === "string" ? body.address.trim() : "";
  const latitude = body.latitude;
  const longitude = body.longitude;
  const hasPinFields =
    address.length > 0 ||
    typeof latitude === "number" ||
    typeof longitude === "number";

  let locationId: string | null = null;

  if (hasPinFields) {
    if (
      !address ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "Pick a valid address from the suggestions" },
        { status: 400 },
      );
    }

    const createdLocation = await createLocationRow(supabase, {
      address,
      latitude,
      longitude,
      name: username,
    });

    if ("error" in createdLocation) {
      return NextResponse.json({ error: createdLocation.error }, { status: 500 });
    }

    locationId = createdLocation.locationId;
  }

  const isDriver = body.is_driver === true;
  let seats: number | null = null;

  if (isDriver && typeof body.seats === "number") {
    if (!Number.isInteger(body.seats)) {
      return NextResponse.json(
        { error: "seats must be a whole number" },
        { status: 400 },
      );
    }
    if (body.seats < 0 || body.seats > MAX_SEATS) {
      return NextResponse.json(
        { error: `seats must be between 0 and ${MAX_SEATS}` },
        { status: 400 },
      );
    }
    seats = body.seats;
  }

  const row: TripParticipantInsert = {
    username,
    trip_id: resolved.tripId,
    password_hash,
    is_driver: isDriver,
    is_admin: body.is_admin === true,
    group_id:
      typeof body.group_id === "string" && body.group_id.trim()
        ? body.group_id.trim()
        : null,
    location: locationId,
    seats,
  };

  const { data, error } = await supabase
    .from("trip_participants")
    .insert(row)
    .select(participantPublicFields)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "This username is already on this trip. Log in with your password instead.",
          code: "username_exists",
          has_password: true,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ participant: data }, { status: 201 });
}
