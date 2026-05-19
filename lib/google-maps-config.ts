/** Browser Maps JavaScript API + Places (autocomplete, map tiles). */
export function getPublicGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getPublicGoogleMapsApiKey());
}
