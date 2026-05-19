"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { JoinTripModal } from "@/components/join-trip-modal";
import { sanitizeTripCodeInput, validateTripCode } from "@/lib/trip-code";

type JoinMode = "signup" | "login";

type LandingJoinCardProps = {
  cardClassName: string;
};

export function LandingJoinCard({ cardClassName }: LandingJoinCardProps) {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTripCode, setActiveTripCode] = useState("");
  const [modalMode, setModalMode] = useState<JoinMode>("signup");

  useEffect(() => {
    const fromUrl = searchParams.get("code")?.trim() ?? "";
    if (!fromUrl) return;

    setCode(fromUrl);
    const validationError = validateTripCode(fromUrl);
    if (validationError) {
      setCodeError(validationError);
      return;
    }

    setCodeError(null);
    setActiveTripCode(fromUrl);
    setModalMode("signup");
    setModalOpen(true);
  }, [searchParams]);

  const openModal = (tripCode: string, mode: JoinMode) => {
    const validationError = validateTripCode(tripCode);
    if (validationError) {
      setCodeError(validationError);
      return;
    }

    setCodeError(null);
    setActiveTripCode(tripCode);
    setModalMode(mode);
    setModalOpen(true);
  };

  const onOpenSignUp = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Invite code is required");
      return;
    }
    openModal(trimmed, "signup");
  };

  const onOpenLogin = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setCodeError("Invite code is required");
      return;
    }
    openModal(trimmed, "login");
  };

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
            placeholder="e.g. TRIP42 (6+ letters & numbers)"
            autoComplete="off"
            minLength={6}
            className="w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2"
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
              className="w-full rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full rounded-2xl border border-atlas-teal/25 bg-white/70 px-4 py-3.5 text-sm font-semibold text-atlas-teal shadow-sm transition-colors hover:bg-white/90"
            >
              Log in
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
