import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";
  const trip_id = req.nextUrl.searchParams.get("trip_id")?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_participants")
    .select(
      "username, trip_id, group_id, location, is_driver, is_admin, seats",
    )
    .eq("username", username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ participant: data });
}
