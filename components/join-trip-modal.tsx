"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { PlacesAutocompleteInput } from "@/components/places-autocomplete-input";
import { readApiError } from "@/lib/api-error";
import { isValidPin, type PinSelection } from "@/lib/pin";
import { setTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

type JoinMode = "signup" | "login";

type SignUpConflict = {
  error: string;
  code?: string;
  has_password?: boolean;
};

const inputClassName =
  "w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2";

const panelClassName =
  "relative w-full max-w-md rounded-3xl border border-white/45 bg-white/40 p-7 shadow-[0_20px_50px_-12px_rgba(12,61,63,0.2)] backdrop-blur-md sm:p-8";

type JoinTripModalProps = {
  open: boolean;
  tripCode: string;
  initialMode?: JoinMode;
  onClose: () => void;
};

export function JoinTripModal({
  open,
  tripCode,
  initialMode = "signup",
  onClose,
}: JoinTripModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<JoinMode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState<PinSelection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
      setMode(initialMode);
      setUsername("");
      setPassword("");
      setPin(null);
      setError(null);
      setInfo(null);
      setShowLoginPrompt(false);
      setIsSubmitting(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const switchMode = (next: JoinMode) => {
    setMode(next);
    setPin(null);
    setError(null);
    setInfo(null);
    setShowLoginPrompt(false);
  };

  const completeJoin = (participant: TripParticipant) => {
    setTripSession({
      username: participant.username,
      tripId: participant.trip_id,
      tripCode,
    });
    onClose();
    router.push("/dashboard");
  };

  const onSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    setShowLoginPrompt(false);

    try {
      const res = await fetch("/api/participants/add-participant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          trip_code: tripCode,
          ...(isValidPin(pin)
            ? {
                address: pin.address,
                latitude: pin.latitude,
                longitude: pin.longitude,
              }
            : {}),
          ...(password.trim() ? { password } : {}),
        }),
      });

      if (res.status === 409) {
        const json = (await res.json()) as SignUpConflict;
        setError(
          json.error ??
            "This username is already on this trip. Log in instead.",
        );
        setInfo(
          json.has_password ? "Enter your password on the Log in tab." : null,
        );
        setShowLoginPrompt(true);
        return;
      }

      if (!res.ok) {
        setError(await readApiError(res, "Could not sign up for this trip"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      completeJoin(json.participant);
    } catch {
      setError(
        "Cannot reach the server. Run pnpm dev and add Supabase keys to .env.local (see .env.example).",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    setShowLoginPrompt(false);

    try {
      const res = await fetch("/api/participants/login-participant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          trip_code: tripCode,
          ...(password.trim() ? { password } : {}),
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not log in"));
        return;
      }

      const json = (await res.json()) as { participant: TripParticipant };
      completeJoin(json.participant);
    } catch {
      setError(
        "Cannot reach the server. Run pnpm dev and add Supabase keys to .env.local (see .env.example).",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const isSignUp = mode === "signup";

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
          {isSignUp ? "Sign up for trip" : "Log in to trip"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Code <span className="font-medium text-atlas-teal">{tripCode}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/50 p-1">
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              isSignUp
                ? "bg-atlas-teal text-white shadow-sm"
                : "text-atlas-teal hover:bg-white/60"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              !isSignUp
                ? "bg-atlas-teal text-white shadow-sm"
                : "text-atlas-teal hover:bg-white/60"
            }`}
          >
            Log in
          </button>
        </div>

        <form
          onSubmit={isSignUp ? onSignUp : onLogin}
          className="mt-6 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">Username</span>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
                setInfo(null);
              }}
              type="text"
              placeholder="e.g. alex"
              className={inputClassName}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </label>

          {isSignUp && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-atlas-teal">
                Your location
              </span>
              <PlacesAutocompleteInput
                id="join-trip-pin"
                value={pin}
                onChange={(next) => {
                  setPin(next);
                  setError(null);
                  setInfo(null);
                }}
                disabled={isSubmitting}
                placeholder="Search for your address…"
                className={inputClassName}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-atlas-teal">
              Password (optional)
            </span>
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                setInfo(null);
              }}
              type="password"
              placeholder={
                username.trim()
                  ? `Optional password for ${username.trim()}`
                  : "Optional password"
              }
              className={inputClassName}
              disabled={isSubmitting}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {info && (
            <p className="text-sm text-atlas-teal" role="status">
              {info}
            </p>
          )}

          {showLoginPrompt && isSignUp && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="w-full rounded-2xl border border-atlas-teal/25 bg-white/70 px-4 py-3 text-sm font-semibold text-atlas-teal transition-colors hover:bg-white/90"
            >
              Switch to Log in
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
          >
            {isSubmitting
              ? isSignUp
                ? "Signing up…"
                : "Logging in…"
              : isSignUp
                ? "Sign up"
                : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
