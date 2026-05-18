"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { readApiError } from "@/lib/api-error";
import { setTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

type AddParticipantResponse =
  | { participant: unknown }
  | { error: string };

const inputClassName =
  "w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

const panelClassName =
  "relative w-full max-w-md rounded-3xl border border-white/45 bg-white/40 p-7 shadow-[0_20px_50px_-12px_rgba(12,61,63,0.2)] backdrop-blur-md sm:p-8";

type JoinTripModalProps = {
  open: boolean;
  tripCode: string;
  onClose: () => void;
};

export function JoinTripModal({ open, tripCode, onClose }: JoinTripModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/participants/add-participant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          trip_code: tripCode,
          ...(password.trim() ? { password } : {}),
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Failed to join trip"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      setTripSession({
        username: json.participant.username,
        tripId: json.participant.trip_id,
        tripCode,
      });

      onClose();
      router.push("/dashboard");
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
        aria-labelledby="join-trip-title"
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

        <h2
          id="join-trip-title"
          className="pr-8 text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl"
        >
          Join trip
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Code <span className="font-medium text-atlas-teal">{tripCode}</span>
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              Password (optional)
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={
                username.trim()
                  ? `Optional password for ${username.trim()}`
                  : "Optional password"
              }
              className={inputClassName}
              disabled={isSubmitting}
              autoComplete="new-password"
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
            {isSubmitting ? "Joining…" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
