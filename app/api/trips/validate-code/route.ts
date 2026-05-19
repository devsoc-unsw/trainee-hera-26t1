import { NextResponse, type NextRequest } from "next/server";
import { validateTripCode } from "@/lib/trip-code";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const formatError = validateTripCode(code);
  if (formatError) {
    return NextResponse.json({ error: formatError }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, trip_name, trip_code")
    .eq("trip_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({ valid: true, trip });
}
