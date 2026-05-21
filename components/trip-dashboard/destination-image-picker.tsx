"use client";

import { useEffect, useRef, useState } from "react";
import {
  DESTINATION_IMAGE_ACCEPT,
  MAX_DESTINATION_IMAGES,
} from "@/lib/destination-storage";

type DestinationImagePickerProps = {
  existingCount: number;
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
};

export function DestinationImagePicker({
  existingCount,
  disabled = false,
  onFilesChange,
}: DestinationImagePickerProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, MAX_DESTINATION_IMAGES - existingCount);

  useEffect(() => {
    onFilesChange(pendingFiles);
  }, [pendingFiles, onFilesChange]);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setPendingFiles((prev) => {
      const combined = [...prev, ...selected];
      return combined.slice(0, remaining);
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (remaining === 0) {
    return (
      <p className="text-xs text-slate-500">
        Maximum {MAX_DESTINATION_IMAGES} images reached. Remove one to add more.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={DESTINATION_IMAGE_ACCEPT}
        multiple
        disabled={disabled}
        onChange={onSelect}
        className="text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-atlas-teal/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-atlas-teal hover:file:bg-atlas-teal/15 disabled:opacity-60"
      />
      <p className="text-xs text-slate-500">
        JPEG, PNG, WebP, or AVIF up to 5 MB. {remaining} slot
        {remaining === 1 ? "" : "s"} remaining.
      </p>
      {previewUrls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {previewUrls.map((url, i) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="size-16 rounded-lg object-cover ring-1 ring-atlas-teal/15"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removePending(i)}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white hover:bg-slate-900 disabled:opacity-60"
                aria-label="Remove selected image"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
