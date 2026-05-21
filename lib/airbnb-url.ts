const AIRBNB_HOST_PATTERN = /^([a-z0-9-]+\.)*airbnb\.[a-z.]+$/i;

/**
 * Normalizes an optional Airbnb listing URL. Returns null when empty or invalid.
 */
export function normalizeAirbnbUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (!AIRBNB_HOST_PATTERN.test(url.hostname)) return null;

  return url.toString();
}
