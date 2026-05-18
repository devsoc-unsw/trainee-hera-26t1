import { Client, type GeocodeResult } from "@googlemaps/google-maps-services-js";

export type GoogleMapsAddress = {
  place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
};

function getGoogleMapsClient() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  return { client: new Client({}), apiKey };
}

function fromGeocodeResult(result: GeocodeResult): GoogleMapsAddress {
  return {
    place_id: result.place_id,
    formatted_address: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}

export async function resolveGoogleMapsAddress(
  input: { place_id: string } | { query: string },
): Promise<GoogleMapsAddress> {
  const { client, apiKey } = getGoogleMapsClient();

  if ("place_id" in input) {
    const { data } = await client.placeDetails({
      params: {
        place_id: input.place_id,
        key: apiKey,
        fields: ["place_id", "formatted_address", "geometry"],
      },
    });

    if (data.status !== "OK" || !data.result) {
      throw new Error(
        data.error_message ?? `Places API status: ${data.status}`,
      );
    }

    const result = data.result;
    const location = result.geometry?.location;
    if (!result.place_id || !result.formatted_address || !location) {
      throw new Error("Incomplete place details from Google Maps");
    }

    return {
      place_id: result.place_id,
      formatted_address: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
    };
  }

  const { data } = await client.geocode({
    params: {
      address: input.query,
      key: apiKey,
    },
  });

  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(data.error_message ?? `Geocoding status: ${data.status}`);
  }

  return fromGeocodeResult(data.results[0]);
}
