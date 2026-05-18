"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";

type LandingJoinCardProps = {
  cardClassName: string;
};

export function LandingJoinCard({ cardClassName }: LandingJoinCardProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    const trimmed = code.trim();
    const qs = trimmed ? `?code=${encodeURIComponent(trimmed)}` : "";
    router.push(`/join-trip${qs}`);
  };

  return (
    <article className={cardClassName}>
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-atlas-mist/90 text-atlas-teal shadow-sm">
        <UserPlus className="size-6" strokeWidth={1.75} />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl">
        Join an Existing Trip
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
        Got an invite code? Jump into the itinerary and see where the crew is
        heading next.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="landing-invite-code" className="sr-only">
          Invite code
        </label>
        <input
          id="landing-invite-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter Invite Code"
          autoComplete="off"
          className="w-full rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover disabled:opacity-70"
        >
          {pending ? "Opening…" : "Join"}
        </button>
      </form>
    </article>
  );
}
