"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import type { DestinationImageView } from "@/lib/destination-images";

type DestinationImageGalleryProps = {
  images: DestinationImageView[];
  editable?: boolean;
  deletingId?: string | null;
  onDelete?: (imageId: string) => void;
};

export function DestinationImageGallery({
  images,
  editable = false,
  deletingId = null,
  onDelete,
}: DestinationImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => setPortalReady(true), []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrev = lightboxIndex !== null && lightboxIndex > 0;
  const showNext =
    lightboxIndex !== null && lightboxIndex < images.length - 1;

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && showPrev) {
        setLightboxIndex((i) => (i !== null ? i - 1 : null));
      }
      if (e.key === "ArrowRight" && showNext) {
        setLightboxIndex((i) => (i !== null ? i + 1 : null));
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxIndex, closeLightbox, showPrev, showNext]);

  if (!images.length) return null;

  const lightboxImage =
    lightboxIndex !== null ? images[lightboxIndex] : null;

  const lightbox =
    lightboxImage && lightboxIndex !== null ? (
      <div
        className="fixed inset-0 z-[200] h-dvh w-screen bg-atlas-teal/30 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Full size image"
      >
        <button
          type="button"
          className="absolute inset-0 z-0"
          onClick={closeLightbox}
          aria-label="Close"
        />

        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={lightboxImage.url}
            alt="Destination accommodation full size"
            width={1600}
            height={1200}
            className="mx-auto block h-auto w-auto max-h-[80dvh] max-w-[80vw] rounded-2xl object-contain shadow-[0_20px_50px_-12px_rgba(12,61,63,0.35)]"
            unoptimized
            priority
          />
        </div>

        {images.length > 1 && (
          <p className="absolute left-1/2 top-4 z-20 -translate-x-1/2 text-sm font-medium text-slate-700">
            {lightboxIndex + 1} / {images.length}
          </p>
        )}

        <button
          type="button"
          onClick={closeLightbox}
          className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full border border-white/55 bg-white/70 text-slate-700 shadow-sm transition-colors hover:bg-white sm:right-6 sm:top-6"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={2.25} aria-hidden />
        </button>

        {showPrev && (
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((i) => (i !== null ? i - 1 : null))
            }
            className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-white/70 text-atlas-teal shadow-sm transition-colors hover:bg-white sm:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-6" strokeWidth={2.25} aria-hidden />
          </button>
        )}

        {showNext && (
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((i) => (i !== null ? i + 1 : null))
            }
            className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-white/70 text-atlas-teal shadow-sm transition-colors hover:bg-white sm:right-6"
            aria-label="Next image"
          >
            <ChevronRight className="size-6" strokeWidth={2.25} aria-hidden />
          </button>
        )}
      </div>
    ) : null;

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {images.map((img, index) => (
          <li key={img.id} className="relative">
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="block overflow-hidden rounded-xl ring-1 ring-atlas-teal/15 transition-shadow hover:ring-atlas-teal/40 focus:outline-none focus:ring-2 focus:ring-atlas-teal/50"
              aria-label="View full image"
            >
              <Image
                src={img.url}
                alt="Destination accommodation"
                width={80}
                height={80}
                className="size-20 object-cover"
                unoptimized
              />
            </button>
            {editable && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(img.id);
                }}
                disabled={deletingId === img.id}
                className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white hover:bg-slate-900 disabled:opacity-60"
                aria-label="Remove image"
              >
                {deletingId === img.id ? "…" : "×"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {portalReady && lightbox
        ? createPortal(lightbox, document.body)
        : null}
    </>
  );
}
