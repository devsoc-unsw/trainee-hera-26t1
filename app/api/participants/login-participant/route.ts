import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/password";
import { participantPublicFields, resolveTripId } from "@/lib/resolve-trip";
import { createClient } from "@/lib/supabase/server";

type LoginParticipantBody = {
  username?: string;
  trip_id?: string;
  trip_code?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  let body: Partial<LoginParticipantBody>;
  try {
    body = (await req.json()) as Partial<LoginParticipantBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const tripId =
    typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const tripCode =
    typeof body.trip_code === "string" ? body.trip_code.trim() : "";
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const resolved = await resolveTripId(supabase, tripId, tripCode);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const { data: participant, error } = await supabase
    .from("trip_participants")
    .select(`${participantPublicFields}, password_hash`)
    .eq("username", username)
    .eq("trip_id", resolved.tripId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!participant) {
    return NextResponse.json(
      {
        error:
          "No account found with that username on this trip. Sign up first.",
      },
      { status: 404 },
    );
  }

  if (participant.password_hash) {
    if (!password) {
      return NextResponse.json(
        { error: "Password is required for this account" },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(password, participant.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 },
      );
    }
  }

  const { password_hash: _, ...publicParticipant } = participant;

  return NextResponse.json({ participant: publicParticipant });
}
