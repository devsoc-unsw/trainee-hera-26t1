import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  ALLOWED_DESTINATION_IMAGE_TYPES,
  buildDestinationImagePath,
  DESTINATION_IMAGES_BUCKET,
  extensionForImageMime,
  getDestinationImagePublicUrl,
  MAX_DESTINATION_IMAGE_BYTES,
  MAX_DESTINATION_IMAGES,
} from "@/lib/destination-storage";
import { createClient } from "@/lib/supabase/server";

async function verifyTripLocation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  locationId: string,
) {
  const { data: trip, error } = await supabase
    .from("trips")
    .select("location")
    .eq("id", tripId)
    .maybeSingle();

  if (error) return { error: error.message, status: 500 as const };
  if (!trip) return { error: "Trip not found", status: 404 as const };
  if (trip.location !== locationId) {
    return {
      error: "location_id does not match this trip's destination",
      status: 400 as const,
    };
  }
  return { ok: true as const };
}

// TODO(server-auth): verify caller is trip admin.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const trip_id = String(formData.get("trip_id") ?? "").trim();
  const location_id = String(formData.get("location_id") ?? "").trim();

  if (!trip_id) {
    return NextResponse.json({ error: "trip_id is required" }, { status: 400 });
  }
  if (!location_id) {
    return NextResponse.json(
      { error: "location_id is required" },
      { status: 400 },
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const supabase = await createClient();
  const verify = await verifyTripLocation(supabase, trip_id, location_id);
  if (!("ok" in verify)) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { count: existingCount, error: countError } = await supabase
    .from("location_images")
    .select("id", { count: "exact", head: true })
    .eq("location_id", location_id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const currentCount = existingCount ?? 0;
  if (currentCount + files.length > MAX_DESTINATION_IMAGES) {
    return NextResponse.json(
      {
        error: `Maximum ${MAX_DESTINATION_IMAGES} images per destination (${currentCount} already uploaded)`,
      },
      { status: 400 },
    );
  }

  const { data: maxOrderRow } = await supabase
    .from("location_images")
    .select("sort_order")
    .eq("location_id", location_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSortOrder = (maxOrderRow?.sort_order ?? -1) + 1;
  const uploaded: { id: string; storage_path: string; sort_order: number; url: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_DESTINATION_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and AVIF images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_DESTINATION_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Each image must be 5 MB or smaller" },
        { status: 400 },
      );
    }

    const ext = extensionForImageMime(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image type" },
        { status: 400 },
      );
    }
    const storage_path = buildDestinationImagePath(
      trip_id,
      location_id,
      `${randomUUID()}.${ext}`,
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(DESTINATION_IMAGES_BUCKET)
      .upload(storage_path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: row, error: insertError } = await supabase
      .from("location_images")
      .insert({
        location_id,
        storage_path,
        sort_order: nextSortOrder,
      })
      .select("id, storage_path, sort_order")
      .single();

    if (insertError) {
      await supabase.storage.from(DESTINATION_IMAGES_BUCKET).remove([storage_path]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    uploaded.push({
      id: row.id,
      storage_path: row.storage_path,
      sort_order: row.sort_order,
      url: getDestinationImagePublicUrl(row.storage_path),
    });
    nextSortOrder += 1;
  }

  return NextResponse.json({ images: uploaded });
}

type DeleteBody = {
  trip_id?: string;
  location_id?: string;
  image_id?: string;
};

export async function DELETE(req: NextRequest) {
  let body: Partial<DeleteBody>;
  try {
    body = (await req.json()) as Partial<DeleteBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trip_id = typeof body.trip_id === "string" ? body.trip_id.trim() : "";
  const location_id =
    typeof body.location_id === "string" ? body.location_id.trim() : "";
  const image_id =
    typeof body.image_id === "string" ? body.image_id.trim() : "";

  if (!trip_id || !location_id || !image_id) {
    return NextResponse.json(
      { error: "trip_id, location_id, and image_id are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const verify = await verifyTripLocation(supabase, trip_id, location_id);
  if (!("ok" in verify)) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { data: image, error: fetchError } = await supabase
    .from("location_images")
    .select("id, storage_path, location_id")
    .eq("id", image_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!image || image.location_id !== location_id) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from(DESTINATION_IMAGES_BUCKET)
    .remove([image.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("location_images")
    .delete()
    .eq("id", image_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
