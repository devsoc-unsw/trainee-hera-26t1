import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Confirm the user has an active session.
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to update your password." },
        { status: 401 },
      );
    }

    // If the user already has a password set, re-verify it before allowing the change.
    // Users who signed up via OAuth and are setting a password for the first time
    // can omit currentPassword.
    const hasEmailProvider = user.identities?.some(
      (id) => id.provider === "email",
    );

    if (hasEmailProvider && currentPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 },
        );
      }
    }

    // Update to the new password.
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Password updated successfully." },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
