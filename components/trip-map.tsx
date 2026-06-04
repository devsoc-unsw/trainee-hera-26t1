"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TripMapLocation,
  TripMapParticipant,
} from "@/app/api/trips/map-locations/route";
import { hasMapCoords } from "@/components/trip-dashboard/member-utils";
import { loadGoogleMaps } from "@/hooks/use-google-maps";
import { readApiError } from "@/lib/api-error";
import {
  createDestinationPinIcon,
  createDriverMapPinIcon,
  createMapPinIcon,
  DESTINATION_PIN_COLOR,
} from "@/lib/map-pin-icon";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { getTripSession } from "@/lib/trip-session";

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 10;
const FOCUS_ZOOM = 15;
const ATLAS_TEAL = "#0c3d3f";
const MEMBER_PIN_Z = 200;
const FOCUSED_PIN_Z = 500;
const DESTINATION_PIN_Z = 1000;
const FOCUSED_DESTINATION_PIN_Z = 1100;

type TripMapProps = {
  focusUsername?: string | null;
  focusDestination?: boolean;
  selectedUsername?: string | null;
  onMemberSelect?: (username: string) => void;
  refreshKey?: number;
};

export function TripMap({
  focusUsername,
  focusDestination = false,
  selectedUsername,
  onMemberSelect,
  refreshKey = 0,
}: TripMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const memberMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
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
  }, [loadMapData, refreshKey]);

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
    memberMarkersRef.current.clear();
    destinationMarkerRef.current = null;

    const bounds = new google.maps.LatLngBounds();
    let pointCount = 0;

    if (hasMapCoords(destination)) {
      const position = {
        lat: destination.latitude,
        lng: destination.longitude,
      };
      const destinationMarker = new google.maps.Marker({
        map,
        position,
        title: destination.address ?? "Trip destination",
        zIndex: DESTINATION_PIN_Z,
        icon: createDestinationPinIcon(),
      });
      destinationMarkerRef.current = destinationMarker;
      markersRef.current.push(destinationMarker);
      bounds.extend(position);
      pointCount += 1;
    }

    const withCoords = participants.filter((p) => hasMapCoords(p.location));

    for (const p of withCoords) {
      const position = {
        lat: p.location!.latitude!,
        lng: p.location!.longitude!,
      };
      const fillColor = p.group_color ?? ATLAS_TEAL;
      const isSelected = selectedUsername === p.username;
      const letter = p.username.slice(0, 1).toUpperCase();
      const marker = new google.maps.Marker({
        map,
        position,
        title: p.is_driver ? `${p.username} (driver)` : p.username,
        zIndex: isSelected ? FOCUSED_PIN_Z : MEMBER_PIN_Z,
        icon: p.is_driver
          ? createDriverMapPinIcon(fillColor, letter)
          : createMapPinIcon(fillColor, letter),
        cursor: onMemberSelect ? "pointer" : undefined,
      });
      if (onMemberSelect) {
        marker.addListener("click", () => onMemberSelect(p.username));
      }
      markersRef.current.push(marker);
      memberMarkersRef.current.set(p.username, marker);
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
  }, [mapReady, participants, destination, selectedUsername, onMemberSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusUsername) return;

    const participant = participants.find((p) => p.username === focusUsername);
    if (!participant || !hasMapCoords(participant.location)) return;

    const position = {
      lat: participant.location.latitude,
      lng: participant.location.longitude,
    };

    map.panTo(position);
    const zoom = map.getZoom();
    if (zoom == null || zoom < FOCUS_ZOOM) {
      map.setZoom(FOCUS_ZOOM);
    }

    destinationMarkerRef.current?.setZIndex(DESTINATION_PIN_Z);
    destinationMarkerRef.current?.setAnimation(null);

    for (const [username, marker] of memberMarkersRef.current) {
      marker.setZIndex(
        username === focusUsername ? FOCUSED_PIN_Z : MEMBER_PIN_Z,
      );
      marker.setAnimation(null);
    }

    const focusedMarker = memberMarkersRef.current.get(focusUsername);
    if (focusedMarker) {
      focusedMarker.setAnimation(google.maps.Animation.BOUNCE);
      const stopBounce = window.setTimeout(() => {
        focusedMarker.setAnimation(null);
      }, 1400);
      return () => window.clearTimeout(stopBounce);
    }
  }, [focusUsername, mapReady, participants]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusDestination || !hasMapCoords(destination)) {
      return;
    }

    const position = {
      lat: destination.latitude,
      lng: destination.longitude,
    };

    map.panTo(position);
    const zoom = map.getZoom();
    if (zoom == null || zoom < FOCUS_ZOOM) {
      map.setZoom(FOCUS_ZOOM);
    }

    for (const marker of memberMarkersRef.current.values()) {
      marker.setZIndex(MEMBER_PIN_Z);
      marker.setAnimation(null);
    }

    const destMarker = destinationMarkerRef.current;
    if (destMarker) {
      destMarker.setZIndex(FOCUSED_DESTINATION_PIN_Z);
      destMarker.setAnimation(google.maps.Animation.BOUNCE);
      const stopBounce = window.setTimeout(() => {
        destMarker.setAnimation(null);
      }, 1400);
      return () => window.clearTimeout(stopBounce);
    }
  }, [focusDestination, mapReady, destination]);

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
  const hasDestinationPin = hasMapCoords(destination);

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
                className="inline-flex size-4 items-center justify-center text-sm leading-none"
                style={{ color: DESTINATION_PIN_COLOR }}
                aria-hidden
              >
                ★
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
