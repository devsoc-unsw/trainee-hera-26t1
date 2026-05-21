import { Suspense } from "react";
import { LandingCreateCard } from "@/components/landing-create-card";
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
              road trips made easy.
            </h1>
          </div>

          <div className="mx-auto -mt-3 grid w-full max-w-5xl grid-cols-1 gap-6 sm:-mt-5 sm:gap-8 md:grid-cols-2 md:gap-8">
            <LandingCreateCard cardClassName={cardClass} />

            <Suspense>
              <LandingJoinCard cardClassName={cardClass} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
