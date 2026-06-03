import { NextResponse, type NextRequest } from "next/server";
import { createLocationRow } from "@/lib/create-location";
import {
  participantPublicFields,
  resolveTripId,
} from "@/lib/resolve-trip";
import { createClient } from "@/lib/supabase/server";

type UpdateLocationBody = {
  username?: string;
  trip_id?: string;
  trip_code?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  clear?: boolean;
  caller_username?: string;
};

async function verifyAdminForOtherUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  callerUsername: string,
) {
  const { data: caller, error: callerError } = await supabase
    .from("trip_participants")
    .select("is_admin")
    .eq("username", callerUsername)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (callerError) {
    return { error: callerError.message, status: 500 as const };
  }
  if (!caller) {
    return {
      error: "Caller is not a participant on this trip",
      status: 404 as const,
    };
  }
  if (!caller.is_admin) {
    return {
      error: "Only admins can update another member's address",
      status: 403 as const,
    };
  }

  return { ok: true as const };
}

export async function PATCH(req: NextRequest) {
  let body: Partial<UpdateLocationBody>;
  try {
    body = (await req.json()) as Partial<UpdateLocationBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const tripId =
    typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const tripCode =
    typeof body.trip_code === "string" ? body.trip_code.trim() : "";
  const caller_username =
    typeof body.caller_username === "string"
      ? body.caller_username.trim()
      : "";
  const shouldClear = body.clear === true;

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const resolved = await resolveTripId(supabase, tripId, tripCode);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  if (shouldClear) {
    if (caller_username && caller_username !== username) {
      const adminCheck = await verifyAdminForOtherUser(
        supabase,
        resolved.tripId,
        caller_username,
      );
      if ("error" in adminCheck) {
        return NextResponse.json(
          { error: adminCheck.error },
          { status: adminCheck.status },
        );
      }
    }

    const { data, error } = await supabase
      .from("trip_participants")
      .update({ location: null })
      .eq("username", username)
      .eq("trip_id", resolved.tripId)
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

  const address =
    typeof body.address === "string" ? body.address.trim() : "";
  const latitude = body.latitude;
  const longitude = body.longitude;

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 },
    );
  }

  const created = await createLocationRow(supabase, {
    address,
    latitude,
    longitude,
    name: username,
  });

  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("trip_participants")
    .update({ location: created.locationId })
    .eq("username", username)
    .eq("trip_id", resolved.tripId)
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
