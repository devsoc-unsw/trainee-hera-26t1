import Link from "next/link";
import { Suspense } from "react";
import { MapPinPlus } from "lucide-react";
import { LandingJoinCard } from "@/components/landing-join-card";
import { LandingNavbar } from "@/components/landing-navbar";
import { LandingMapBackground } from "@/components/landing-map-background";

const cardClass =
  "flex flex-col rounded-3xl border border-white/45 bg-white/32 p-7 shadow-[0_20px_50px_-12px_rgba(12,61,63,0.14)] backdrop-blur-md sm:p-8";

export function LandingHome() {
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden text-slate-800">
      <LandingMapBackground />
      <div className="relative flex min-h-[100dvh] flex-1 flex-col">
        <LandingNavbar />

        <main className="flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 md:py-12">
          <div className="mx-auto w-full max-w-3xl text-center">
            <h1 className="text-balance font-semibold leading-[1.1] tracking-tight text-atlas-teal text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Set your pace. Map your journey.
            </h1>
          </div>

          <div className="mx-auto -mt-3 grid w-full max-w-5xl grid-cols-1 gap-6 sm:-mt-5 sm:gap-8 md:grid-cols-2 md:gap-8">
            <article className={cardClass}>
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-atlas-coral/90 text-atlas-teal shadow-sm">
                <MapPinPlus className="size-6" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-atlas-teal sm:text-xl">
                Create a New Trip
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
                Design your dream coastal route. Pick stops, invite buddies, and
                sync your favorite soundtracks.
              </p>
              <Link
                href="/create-trip"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-atlas-teal px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-atlas-teal-hover"
              >
                Start Planning
                <span aria-hidden>→</span>
              </Link>
            </article>

            <Suspense>
              <LandingJoinCard cardClassName={cardClass} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
