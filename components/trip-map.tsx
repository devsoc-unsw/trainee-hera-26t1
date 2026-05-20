"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TripMapLocation,
  TripMapParticipant,
} from "@/app/api/trips/map-locations/route";
import { loadGoogleMaps } from "@/hooks/use-google-maps";
import { readApiError } from "@/lib/api-error";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { getTripSession } from "@/lib/trip-session";

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 10;
const ATLAS_TEAL = "#0c3d3f";

/** Default Google pin shape, filled atlas-teal (built after Maps loads). */
function tealPinIcon(): google.maps.Symbol {
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: ATLAS_TEAL,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: new google.maps.Point(12, 22),
    labelOrigin: new google.maps.Point(12, 9),
  };
}

function hasCoords(
  loc: TripMapLocation | null | undefined,
): loc is TripMapLocation & { latitude: number; longitude: number } {
  return (
    loc != null &&
    loc.latitude != null &&
    loc.longitude != null &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude)
  );
}

export function TripMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [participants, setParticipants] = useState<TripMapParticipant[]>([]);
  const [destination, setDestination] = useState<TripMapLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const session = getTripSession();
  const tripId = session?.tripId;

  const loadMapData = useCallback(async () => {
    if (!tripId) {
      setError("No trip session. Join a trip from the home page.");
      return;
    }

    setError(null);

    try {
      const params = new URLSearchParams({ trip_id: tripId });
      const res = await fetch(`/api/trips/map-locations?${params}`);

      if (!res.ok) {
        setError(await readApiError(res, "Could not load map pins"));
        return;
      }

      const json = (await res.json()) as {
        participants: TripMapParticipant[];
        destination: TripMapLocation | null;
      };
      setParticipants(json.participants ?? []);
      setDestination(json.destination ?? null);
    } catch {
      setError("Could not load map pins");
    }
  }, [tripId]);

  useEffect(() => {
    void loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    if (!isGoogleMapsConfigured() || !mapContainerRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapContainerRef.current) return;

        mapRef.current = new g.maps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load Google Maps",
          );
        }
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let pointCount = 0;

    if (hasCoords(destination)) {
      const position = {
        lat: destination.latitude,
        lng: destination.longitude,
      };
      const destinationMarker = new google.maps.Marker({
        map,
        position,
        title: destination.address ?? "Trip destination",
        zIndex: 1000,
        icon: tealPinIcon(),
        label: {
          text: "D",
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: "13px",
        },
      });
      markersRef.current.push(destinationMarker);
      bounds.extend(position);
      pointCount += 1;
    }

    const withCoords = participants.filter((p) => hasCoords(p.location));

    for (const p of withCoords) {
      const position = {
        lat: p.location!.latitude!,
        lng: p.location!.longitude!,
      };
      const marker = new google.maps.Marker({
        map,
        position,
        title: p.username,
        label: p.username.slice(0, 1).toUpperCase(),
      });
      markersRef.current.push(marker);
      bounds.extend(position);
      pointCount += 1;
    }

    if (pointCount === 1) {
      map.setCenter(bounds.getCenter()!);
      map.setZoom(14);
    } else if (pointCount > 1) {
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [mapReady, participants, destination]);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!mapReady || !map || !container) return;

    const triggerResize = () => {
      google.maps.event.trigger(map, "resize");
    };

    const observer = new ResizeObserver(triggerResize);
    observer.observe(container);
    triggerResize();

    return () => observer.disconnect();
  }, [mapReady]);

  if (!isGoogleMapsConfigured()) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-atlas-mist/30 p-8 text-center">
        <p className="text-sm font-medium text-atlas-teal">Map preview</p>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          Add{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
            .env.local
          </code>{" "}
          to show the trip map and address search.
        </p>
      </div>
    );
  }

  const memberPinCount = participants.filter((p) => p.location).length;
  const hasDestinationPin = hasCoords(destination);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        role="application"
        aria-label="Trip map"
      />
      {error && (
        <p
          className="absolute left-4 top-4 z-[1] max-w-xs rounded-xl bg-white/95 px-3 py-2 text-sm text-red-600 shadow-md"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && (participants.length > 0 || hasDestinationPin) && (
        <div className="absolute bottom-4 left-4 z-[1] flex flex-col gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-md">
          {hasDestinationPin && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: ATLAS_TEAL }}
                aria-hidden
              >
                D
              </span>
              Trip destination
            </span>
          )}
          {participants.length > 0 && (
            <span>
              {memberPinCount} of {participants.length} members have set a pin
            </span>
          )}
        </div>
      )}
    </div>
  );
}
