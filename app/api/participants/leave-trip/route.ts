import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type LeaveTripBody = {
  username?: string;
  trip_id?: string;
};

export async function DELETE(request: NextRequest) {
  let body: Partial<LeaveTripBody>;
  try {
    body = (await request.json()) as Partial<LeaveTripBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const trip_id =
    typeof body.trip_id === "string" ? body.trip_id.trim() : "";

  if (!username) {
    return NextResponse.json(
      { error: "username is required." },
      { status: 400 },
    );
  }
  if (!trip_id) {
    return NextResponse.json(
      { error: "trip_id is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Confirm the participant is actually on this trip.
  const { data: participant, error: fetchError } = await supabase
    .from("trip_participants")
    .select("username, trip_id, is_admin")
    .eq("username", username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!participant) {
    return NextResponse.json(
      { error: "You are not a participant on this trip." },
      { status: 404 },
    );
  }

  // Prevent the sole admin from leaving — someone must remain in control.
  if (participant.is_admin) {
    const { count, error: adminCountError } = await supabase
      .from("trip_participants")
      .select("username", { count: "exact", head: true })
      .eq("trip_id", trip_id)
      .eq("is_admin", true);

    if (adminCountError) {
      return NextResponse.json(
        { error: adminCountError.message },
        { status: 500 },
      );
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "You are the only admin on this trip. Transfer admin to another member before leaving.",
        },
        { status: 403 },
      );
    }
  }

  // Remove the participant from the trip.
  const { error: deleteError } = await supabase
    .from("trip_participants")
    .delete()
    .eq("username", username)
    .eq("trip_id", trip_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "You have successfully left the trip." },
    { status: 200 },
  );
}
