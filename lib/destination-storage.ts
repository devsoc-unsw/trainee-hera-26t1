export const DESTINATION_IMAGES_BUCKET = "trip-destination-images";

export const MAX_DESTINATION_IMAGES = 5;
export const MAX_DESTINATION_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_DESTINATION_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const DESTINATION_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif";

/** File extension for a supported image MIME type, or null if unsupported. */
export function extensionForImageMime(type: string): string | null {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

export function buildDestinationImagePath(
  tripId: string,
  locationId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `trips/${tripId}/locations/${locationId}/${safeName}`;
}

export function getDestinationImagePublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/${DESTINATION_IMAGES_BUCKET}/${storagePath}`;
}

export function getSupabaseStorageHostname(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
