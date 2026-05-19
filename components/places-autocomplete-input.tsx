"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/hooks/use-google-maps";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import type { PinSelection } from "@/lib/pin";

type PlacesAutocompleteInputProps = {
  value: PinSelection | null;
  onChange: (pin: PinSelection | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function PlacesAutocompleteInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Search for your address…",
  className,
  id,
}: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setLoadError(
        "Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.",
      );
      return;
    }

    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !inputRef.current) return;

        const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          if (lat == null || lng == null) return;

          const address = place.formatted_address ?? place.name ?? "";
          if (!address) return;

          onChangeRef.current({
            address,
            latitude: lat,
            longitude: lng,
          });
        });

        autocompleteRef.current = autocomplete;
        setReady(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Could not load Google Maps",
          );
        }
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (inputRef.current && value?.address) {
      inputRef.current.value = value.address;
    }
  }, [value?.address]);

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        id={id}
        type="text"
        defaultValue={value?.address ?? ""}
        onChange={(e) => {
          if (!e.target.value.trim()) {
            onChangeRef.current(null);
          }
        }}
        disabled={disabled || !ready || Boolean(loadError)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loadError && (
        <p className="mt-1 text-sm text-amber-800" role="status">
          {loadError}
        </p>
      )}
    </div>
  );
}
