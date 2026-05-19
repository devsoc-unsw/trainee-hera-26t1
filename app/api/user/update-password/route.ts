import { createClient } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { NextRequest, NextResponse } from "next/server";

type UpdatePasswordBody = {
  username?: string;
  trip_id?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(request: NextRequest) {
  let body: Partial<UpdatePasswordBody>;
  try {
    body = (await request.json()) as Partial<UpdatePasswordBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const trip_id =
    typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";

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
  if (!newPassword) {
    return NextResponse.json(
      { error: "New password is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Fetch the participant to check their existing password hash.
  const { data: participant, error: fetchError } = await supabase
    .from("trip_participants")
    .select("username, trip_id, password_hash")
    .eq("username", username)
    .eq("trip_id", trip_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!participant) {
    return NextResponse.json(
      { error: "Participant not found on this trip." },
      { status: 404 },
    );
  }

  // If they already have a password, verify the current one before allowing a change.
  if (participant.password_hash) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to set a new one." },
        { status: 400 },
      );
    }
    const isMatch = await verifyPassword(currentPassword, participant.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }
  }

  const newHash = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from("trip_participants")
    .update({ password_hash: newHash })
    .eq("username", username)
    .eq("trip_id", trip_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Password updated successfully." },
    { status: 200 },
  );
}
