"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { loadGoogleMaps } from "@/hooks/use-google-maps";
import { readApiError } from "@/lib/api-error";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { getTripSession } from "@/lib/trip-session";

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 10;

export function TripMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [participants, setParticipants] = useState<TripMapParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const session = getTripSession();
  const tripId = session?.tripId;

  const loadParticipants = useCallback(async () => {
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

      const json = (await res.json()) as { participants: TripMapParticipant[] };
      setParticipants(json.participants ?? []);
    } catch {
      setError("Could not load map pins");
    }
  }, [tripId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

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

    const withCoords = participants.filter(
      (p) =>
        p.location?.latitude != null && p.location?.longitude != null,
    );

    const bounds = new google.maps.LatLngBounds();

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
    }

    if (withCoords.length === 1) {
      map.setCenter(bounds.getCenter()!);
      map.setZoom(14);
    } else if (withCoords.length > 1) {
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [mapReady, participants]);

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

  const pinCount = participants.filter((p) => p.location).length;

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
      {!error && participants.length > 0 && (
        <p className="absolute bottom-4 left-4 z-[1] rounded-xl bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-md">
          {pinCount} of {participants.length} members have set a pin
        </p>
      )}
    </div>
  );
}
