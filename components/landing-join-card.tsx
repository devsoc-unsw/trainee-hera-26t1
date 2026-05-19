"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { JoinTripModal } from "@/components/join-trip-modal";
import { readApiError } from "@/lib/api-error";
import { sanitizeTripCodeInput, validateTripCode } from "@/lib/trip-code";
import { setTripSession } from "@/lib/trip-session";
import type { TripParticipant } from "@/types/database";

type JoinMode = "signup" | "login";

type LandingJoinCardProps = {
  cardClassName: string;
};

export function LandingJoinCard({ cardClassName }: LandingJoinCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTripCode, setActiveTripCode] = useState("");
  const [modalMode, setModalMode] = useState<JoinMode>("signup");

  const validateAndOpenModal = useCallback(
    async (tripCode: string, mode: JoinMode) => {
      const formatError = validateTripCode(tripCode);
      if (formatError) {
        setCodeError(formatError);
        return;
      }

      setIsValidating(true);
      setCodeError(null);

      try {
        const params = new URLSearchParams({ code: tripCode });
        const res = await fetch(`/api/trips/validate-code?${params}`);

        if (!res.ok) {
          setCodeError(await readApiError(res, "Invalid invite code"));
          return;
        }

        setActiveTripCode(tripCode);
        setModalMode(mode);
        setModalOpen(true);
      } catch {
        setCodeError("Could not verify invite code");
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  // Auto-join flow: when the URL contains both ?code and ?username (e.g. from
  // an admin invite link), log the user in directly and skip the modal.
  const autoJoin = useCallback(
    async (tripCode: string, username: string) => {
      setIsAutoJoining(true);
      setCodeError(null);

      try {
        const res = await fetch("/api/participants/login-participant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ trip_code: tripCode, username }),
        });

        if (!res.ok) {
          setCodeError(await readApiError(res, "Could not accept this invite"));
          return;
        }

        const json = (await res.json()) as { participant: TripParticipant };
        setTripSession({
          username: json.participant.username,
          tripId: json.participant.trip_id,
          tripCode,
        });
        router.replace("/dashboard");
      } catch {
        setCodeError("Could not reach the server. Try refreshing the page.");
      } finally {
        setIsAutoJoining(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const codeFromUrl = searchParams.get("code")?.trim() ?? "";
    if (!codeFromUrl) return;

    setCode(codeFromUrl);

    const usernameFromUrl = searchParams.get("username")?.trim() ?? "";
    if (usernameFromUrl) {
      void autoJoin(codeFromUrl, usernameFromUrl);
    } else {
      void validateAndOpenModal(codeFromUrl, "signup");
    }
  }, [searchParams, validateAndOpenModal, autoJoin]);

  const onOpenSignUp = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Invite code is required");
      return;
    }
    void validateAndOpenModal(trimmed, "signup");
  };

  const onOpenLogin = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Invite code is required");
      return;
    }
    void validateAndOpenModal(trimmed, "login");
  };

  const buttonsDisabled = isValidating || isAutoJoining;

  return (
    <>
      <article className={cardClassName}>
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-atlas-mist/90 text-atlas-teal shadow-sm">
          <UserPlus className="size-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl">
          Join an Existing Trip
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          Got an invite code? Sign up as a new member or log in if you&apos;ve
          already joined.
        </p>
        {isAutoJoining && (
          <div
            className="mt-4 flex items-center gap-2 rounded-2xl border border-atlas-teal/20 bg-white/70 px-4 py-3 text-sm font-medium text-atlas-teal"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Accepting your invite…
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <label htmlFor="landing-invite-code" className="sr-only">
            Invite code
          </label>
          <input
            id="landing-invite-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(sanitizeTripCodeInput(e.target.value));
              setCodeError(null);
            }}
            placeholder="6-character code e.g. TRIP42"
            autoComplete="off"
            maxLength={6}
            disabled={isAutoJoining}
            className="w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2 disabled:opacity-60"
          />
          {codeError && (
            <p className="text-sm text-red-600" role="alert">
              {codeError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSignUp}
              disabled={buttonsDisabled}
              aria-busy={isValidating}
              className="flex w-full items-center justify-center rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
            >
              {isValidating ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  <span className="sr-only">Checking invite code</span>
                </>
              ) : (
                "Sign up"
              )}
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              disabled={buttonsDisabled}
              aria-busy={isValidating}
              className="flex w-full items-center justify-center rounded-2xl border border-atlas-teal/25 bg-white/70 px-4 py-3.5 text-sm font-semibold text-atlas-teal shadow-sm transition-colors hover:bg-white/90 disabled:opacity-70"
            >
              {isValidating ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  <span className="sr-only">Checking invite code</span>
                </>
              ) : (
                "Log in"
              )}
            </button>
          </div>
        </div>
      </article>

      <JoinTripModal
        open={modalOpen}
        tripCode={activeTripCode}
        initialMode={modalMode}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
