import type { createClient } from "@/lib/supabase/server";
import type { LocationInsert } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CreateLocationInput = {
  address: string;
  latitude: number;
  longitude: number;
  name?: string | null;
};

export async function createLocationRow(
  supabase: Supabase,
  input: CreateLocationInput,
): Promise<{ locationId: string } | { error: string }> {
  const address = input.address.trim();
  if (!address) {
    return { error: "Address is required" };
  }

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { error: "Invalid coordinates" };
  }

  const row: LocationInsert = {
    name: input.name?.trim() ? input.name.trim() : null,
    address,
    latitude: input.latitude,
    longitude: input.longitude,
  };

  const { data, error } = await supabase
    .from("locations")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { locationId: data.id };
}
