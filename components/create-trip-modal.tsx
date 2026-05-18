"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { readApiError } from "@/lib/api-error";
import type { Trip } from "@/types/database";

const inputClassName =
  "w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

const panelClassName =
  "relative w-full max-w-md rounded-3xl border border-white/45 bg-white/40 p-7 shadow-[0_20px_50px_-12px_rgba(12,61,63,0.2)] backdrop-blur-md sm:p-8";

type CreateTripResponse = { trip: Trip };

type CreateTripModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tripName, setTripName] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setPassword("");
      setTripName("");
      setTripDate("");
      setError(null);
      setIsSubmitting(false);
      setCreatedTrip(null);
    }
  }, [open]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Your name is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    const trimmedName = tripName.trim();
    if (!trimmedName) {
      setError("Trip name is required");
      return;
    }
    if (!tripDate) {
      setError("Trip date is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/trips/create-trip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
          trip_name: trimmedName,
          trip_date: tripDate,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Failed to create trip"));
        return;
      }

      const json = (await res.json()) as CreateTripResponse;
      setCreatedTrip(json.trip);
    } catch {
      setError(
        "Cannot reach the server. Run pnpm dev and add Supabase keys to .env.local (see .env.example).",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-atlas-teal/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-trip-title"
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-atlas-teal/70 transition-colors hover:bg-white/50 hover:text-atlas-teal"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {createdTrip ? (
          <div>
            <h2
              id="create-trip-title"
              className="pr-8 text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl"
            >
              Trip created
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Share this invite code so others can join{" "}
              <span className="font-medium text-atlas-teal">
                {createdTrip.trip_name}
              </span>
              .
            </p>
            <p className="mt-6 rounded-2xl border border-white/55 bg-white/70 px-4 py-4 text-center font-mono text-2xl font-semibold tracking-widest text-atlas-teal">
              {createdTrip.trip_code}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/dashboard");
              }}
              className="mt-6 w-full rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover"
            >
              Continue to dashboard
            </button>
          </div>
        ) : (
          <>
            <h2
              id="create-trip-title"
              className="pr-8 text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl"
            >
              Create a trip
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set up your admin account and trip — we&apos;ll generate a
              6-character invite code.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-atlas-teal">
                  Your name
                </span>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  type="text"
                  placeholder="e.g. alex"
                  className={inputClassName}
                  disabled={isSubmitting}
                  required
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-atlas-teal">
                  Your password
                </span>
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  type="password"
                  placeholder={
                    username.trim()
                      ? `Password for ${username.trim()}`
                      : "Password for your account"
                  }
                  className={inputClassName}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-atlas-teal">
                  Trip name
                </span>
                <input
                  value={tripName}
                  onChange={(e) => {
                    setTripName(e.target.value);
                    setError(null);
                  }}
                  type="text"
                  placeholder="e.g. Pacific Coast 2026"
                  className={inputClassName}
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-atlas-teal">
                  Trip date
                </span>
                <input
                  value={tripDate}
                  onChange={(e) => {
                    setTripDate(e.target.value);
                    setError(null);
                  }}
                  type="date"
                  className={inputClassName}
                  disabled={isSubmitting}
                  required
                />
              </label>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
              >
                {isSubmitting ? "Creating…" : "Create trip"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
