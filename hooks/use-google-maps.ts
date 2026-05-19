"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { getPublicGoogleMapsApiKey } from "@/lib/google-maps-config";

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getPublicGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Add it to .env.local to enable the map and address search.",
      ),
    );
  }

  if (!loadPromise) {
    setOptions({ key: apiKey, v: "weekly" });
    loadPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("places"),
    ]).then(() => google);
  }

  return loadPromise;
}
