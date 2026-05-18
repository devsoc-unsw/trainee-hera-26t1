"use client";

import { useState } from "react";
import { MapPinPlus } from "lucide-react";
import { CreateTripModal } from "@/components/create-trip-modal";

type LandingCreateCardProps = {
  cardClassName: string;
};

export function LandingCreateCard({ cardClassName }: LandingCreateCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <article className={cardClassName}>
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-atlas-coral/90 text-atlas-teal shadow-sm">
          <MapPinPlus className="size-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl">
          Create a New Trip
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          Design your dream coastal route. Pick stops, invite buddies, and sync
          your favorite soundtracks.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover"
        >
          Start Planning
          <span aria-hidden>→</span>
        </button>
      </article>

      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
