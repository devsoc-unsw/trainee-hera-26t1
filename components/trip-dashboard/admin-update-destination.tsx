"use client";

import { useCallback, useState } from "react";
import { MapPin } from "lucide-react";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { DestinationImageGallery } from "@/components/trip-dashboard/destination-image-gallery";
import { DestinationImagePicker } from "@/components/trip-dashboard/destination-image-picker";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { readApiError } from "@/lib/api-error";
import type { DestinationImageView } from "@/lib/destination-images";
import { isGoogleMapsConfigured } from "@/lib/google-maps-config";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { cn } from "@/lib/utils";

type Step = "idle" | "confirming" | "loading";

type AdminUpdateDestinationProps = {
  tripId: string;
  currentAddress: string | null;
  currentLocationId: string | null;
  currentAirbnbUrl: string | null;
  currentImages: DestinationImageView[];
  onUpdated?: () => void;
};

async function uploadPendingImages(
  tripId: string,
  locationId: string,
  files: File[],
): Promise<string | null> {
  if (!files.length) return null;
  const formData = new FormData();
  formData.set("trip_id", tripId);
  formData.set("location_id", locationId);
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch("/api/trips/destination-images", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    return readApiError(res, "Could not upload images");
  }
  return null;
}

export function AdminUpdateDestination({
  tripId,
  currentAddress,
  currentLocationId,
  currentAirbnbUrl,
  currentImages,
  onUpdated,
}: AdminUpdateDestinationProps) {
  const mapsConfigured = isGoogleMapsConfigured();

  const initialPin: PinSelection | null = currentAddress?.trim()
    ? { address: currentAddress.trim(), latitude: NaN, longitude: NaN }
    : null;
  const [pin, setPin] = useState<PinSelection | null>(initialPin);
  const [airbnbUrl, setAirbnbUrl] = useState(currentAirbnbUrl ?? "");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const hasCurrentDestination = !!currentAddress?.trim();
  const hasValidPin = isValidPin(pin);
  const addressChanged =
    hasValidPin && pin.address.trim() !== (currentAddress ?? "").trim();
  const airbnbChanged =
    airbnbUrl.trim() !== (currentAirbnbUrl ?? "").trim();
  const hasPendingFiles = pendingFiles.length > 0;

  const canSubmitDestination = mapsConfigured && hasValidPin && addressChanged;
  const canSubmitMetadata =
    !!currentLocationId &&
    !addressChanged &&
    (airbnbChanged || hasPendingFiles);
  const canSubmitFirstTime =
    mapsConfigured && hasValidPin && !hasCurrentDestination;
  const canSubmit =
    canSubmitDestination || canSubmitMetadata || canSubmitFirstTime;

  const needsConfirmation = hasCurrentDestination && addressChanged;

  const handleFilesChange = useCallback((files: File[]) => {
    setPendingFiles(files);
  }, []);

  const onDeleteImage = async (imageId: string) => {
    if (!currentLocationId) return;
    setDeletingImageId(imageId);
    setError(null);
    try {
      const res = await fetch("/api/trips/destination-images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          location_id: currentLocationId,
          image_id: imageId,
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res, "Could not remove image"));
        return;
      }
      onUpdated?.();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setDeletingImageId(null);
    }
  };

  const onConfirmUpdate = async () => {
    if (!canSubmit) return;
    const stateOnError: Step = needsConfirmation ? "confirming" : "idle";
    setStep("loading");
    setError(null);

    try {
      let locationId = currentLocationId;

      if (addressChanged || (!hasCurrentDestination && hasValidPin && pin)) {
        const res = await fetch("/api/trips/update-destination", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            trip_id: tripId,
            address: pin!.address,
            latitude: pin!.latitude,
            longitude: pin!.longitude,
            airbnb_url: airbnbUrl.trim() || null,
          }),
        });

        if (!res.ok) {
          setError(await readApiError(res, "Could not update destination"));
          setStep(stateOnError);
          return;
        }

        const json = (await res.json()) as {
          destination?: { id: string };
        };
        locationId = json.destination?.id ?? locationId;
      } else if (canSubmitMetadata && currentLocationId) {
        const res = await fetch("/api/trips/destination-metadata", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            trip_id: tripId,
            location_id: currentLocationId,
            airbnb_url: airbnbUrl.trim() || null,
          }),
        });

        if (!res.ok) {
          setError(await readApiError(res, "Could not update accommodation"));
          setStep(stateOnError);
          return;
        }

        locationId = currentLocationId;
      }

      if (locationId && pendingFiles.length > 0) {
        const uploadError = await uploadPendingImages(
          tripId,
          locationId,
          pendingFiles,
        );
        if (uploadError) {
          setError(uploadError);
          setStep(stateOnError);
          return;
        }
        setPendingFiles([]);
      }

      setStep("idle");
      onUpdated?.();
    } catch {
      setError("Could not reach the server. Try again.");
      setStep(stateOnError);
    }
  };

  const onSubmit = () => {
    if (!canSubmit) {
      if (!mapsConfigured) {
        setError("Google Maps is not configured");
      } else if (!hasValidPin) {
        setError("Pick a destination from the suggestions");
      } else {
        setError("Change the destination, Airbnb link, or add images to save");
      }
      return;
    }
    setError(null);
    if (needsConfirmation) {
      setStep("confirming");
    } else {
      void onConfirmUpdate();
    }
  };

  const onCancelConfirm = () => {
    setStep("idle");
    setError(null);
  };

  const saveLabel =
    step === "loading"
      ? "Saving…"
      : addressChanged && hasCurrentDestination
        ? "Update destination"
        : hasCurrentDestination
          ? "Save accommodation"
          : "Set destination";

  return (
    <div className={cn(dashboardSectionClass, "flex flex-col gap-4")}>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-atlas-teal">
          <MapPin className="size-5" strokeWidth={2.25} aria-hidden />
          {hasCurrentDestination ? "Update destination" : "Set destination"}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {hasCurrentDestination
            ? "Change where this trip is heading, or add an optional Airbnb link and photos. Updating the address resets driving groups."
            : "Set a destination so members can be grouped together. You can optionally add an Airbnb link and photos."}
        </p>
      </div>

      <label className="flex flex-col gap-1.5" htmlFor="destination-input">
        <span className="text-sm font-medium text-atlas-teal">Destination</span>
        <PlacesAutocompleteInput
          id="destination-input"
          value={pin}
          onChange={(newPin) => {
            setPin(newPin);
            setPendingFiles([]);
            setError(null);
            if (step === "confirming") setStep("idle");
          }}
          disabled={step === "loading"}
          placeholder="Search for a destination…"
          className="w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2 disabled:opacity-60"
        />
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="airbnb-url-input">
        <span className="text-sm font-medium text-atlas-teal">
          Airbnb listing <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <input
          id="airbnb-url-input"
          type="url"
          value={airbnbUrl}
          onChange={(e) => {
            setAirbnbUrl(e.target.value);
            setError(null);
          }}
          disabled={step === "loading"}
          placeholder="https://www.airbnb.com/rooms/…"
          className="w-full rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2 disabled:opacity-60"
        />
      </label>

      {currentImages.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-atlas-teal">Photos</span>
          <DestinationImageGallery
            images={currentImages}
            editable
            deletingId={deletingImageId}
            onDelete={onDeleteImage}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-atlas-teal">
          Add photos <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <DestinationImagePicker
          existingCount={currentImages.length}
          disabled={step === "loading"}
          onFilesChange={handleFilesChange}
        />
      </div>

      {step !== "confirming" && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || step === "loading"}
          className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
        >
          {saveLabel}
        </button>
      )}

      {step === "confirming" && pin && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-900">
            <p className="font-medium">
              Update destination to{" "}
              <span className="font-mono">{pin.address}</span>?
            </p>
            <p className="mt-1.5 text-amber-800">
              This will reset all driving groups for this trip. Members will
              keep their pins but will need to be regrouped.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmUpdate}
              className="flex-1 rounded-xl bg-atlas-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-atlas-teal-hover"
            >
              Yes, update
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step !== "confirming" && error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
