import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateRoleBody = {
  username?: string;
  trip_id?: string;
  is_driver?: boolean;
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

  const { data, error } = await supabase
    .from("trip_participants")
    .update({ is_driver: body.is_driver })
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
