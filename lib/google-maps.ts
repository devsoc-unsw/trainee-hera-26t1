import { Client, type GeocodeResult } from "@googlemaps/google-maps-services-js";

export type GoogleMapsAddress = {
  address: string;
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
    address: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}

export async function resolveGoogleMapsAddress(
  query: string,
): Promise<GoogleMapsAddress> {
  const { client, apiKey } = getGoogleMapsClient();

  const { data } = await client.geocode({
    params: {
      address: query,
      key: apiKey,
    },
  });

  if (data.status !== "OK" || !data.results[0]) {
    throw new Error(data.error_message ?? `Geocoding status: ${data.status}`);
  }

  return fromGeocodeResult(data.results[0]);
}
