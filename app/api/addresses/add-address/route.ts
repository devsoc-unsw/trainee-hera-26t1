import { NextResponse, type NextRequest } from "next/server";
import { resolveGoogleMapsAddress } from "@/lib/google-maps";
import { createClient } from "@/lib/supabase/server";

type AddAddressBody = {
  place_id?: string;
  query?: string;
};

export async function POST(req: NextRequest) {
  let body: Partial<AddAddressBody>;
  try {
    body = (await req.json()) as Partial<AddAddressBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const placeId =
    typeof body.place_id === "string" ? body.place_id.trim() : "";
  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!placeId && !query) {
    return NextResponse.json(
      { error: "Provide place_id or query" },
      { status: 400 },
    );
  }

  let googleAddress;
  try {
    googleAddress = await resolveGoogleMapsAddress(
      placeId ? { place_id: placeId } : { query },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve address";

    if (message === "GOOGLE_MAPS_API_KEY is not configured") {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      place_id: googleAddress.place_id,
      formatted_address: googleAddress.formatted_address,
      latitude: googleAddress.latitude,
      longitude: googleAddress.longitude,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ address: data }, { status: 201 });
}
