import { NextResponse, type NextRequest } from "next/server";
import { resolveGoogleMapsAddress } from "@/lib/google-maps";
import { createClient } from "@/lib/supabase/server";
import type { LocationInsert } from "@/types/database";

type AddAddressBody = {
  query?: string;
  name?: string;
};

export async function POST(req: NextRequest) {
  let body: Partial<AddAddressBody>;
  try {
    body = (await req.json()) as Partial<AddAddressBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveGoogleMapsAddress(query);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve address";

    if (message === "GOOGLE_MAPS_API_KEY is not configured") {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const row: LocationInsert = {
    name,
    address: resolved.address,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
  };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location: data }, { status: 201 });
}
