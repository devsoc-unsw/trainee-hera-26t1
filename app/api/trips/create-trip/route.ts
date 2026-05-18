import { NextResponse, type NextRequest } from "next/server";
import { generateTripCode } from "@/lib/trip-code";
import { createClient } from "@/lib/supabase/server";
import type { TripInsert } from "@/types/database";

type CreateTripBody = {
  trip_name?: string;
  trip_date?: string;
  location?: string;
};

const MAX_CODE_ATTEMPTS = 10;

async function generateUniqueTripCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateTripCode();

    const { data, error } = await supabase
      .from("trips")
      .select("id")
      .eq("trip_code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return code;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  let body: Partial<CreateTripBody>;
  try {
    body = (await req.json()) as Partial<CreateTripBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_name =
    typeof body.trip_name === "string" ? body.trip_name.trim() : "";
  if (!trip_name) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }

  const trip_dateRaw =
    typeof body.trip_date === "string" ? body.trip_date.trim() : "";
  if (!trip_dateRaw) {
    return NextResponse.json({ error: "Trip date is required" }, { status: 400 });
  }

  const parsed = new Date(trip_dateRaw);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Trip date is invalid" }, { status: 400 });
  }
  const trip_date = parsed.toISOString();

  const location =
    typeof body.location === "string" && body.location.trim()
      ? body.location.trim()
      : null;

  const supabase = await createClient();

  let trip_code: string | null;
  try {
    trip_code = await generateUniqueTripCode(supabase);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check trip code";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!trip_code) {
    return NextResponse.json(
      { error: "Could not generate a unique trip code" },
      { status: 500 },
    );
  }

  const row: TripInsert = {
    trip_name,
    trip_date,
    location,
    trip_code,
  };

  const { data, error } = await supabase
    .from("trips")
    .insert(row)
    .select("id, trip_name, trip_date, location, trip_code, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Trip code already exists, please try again" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ trip: data }, { status: 201 });
}
