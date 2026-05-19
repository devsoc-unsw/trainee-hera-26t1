"use client";

import { useState } from "react";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { TripMap } from "@/components/trip-map";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  const [mapKey, setMapKey] = useState(0);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <DashboardNavbar />
      <div className="absolute inset-0 pt-[4.25rem] sm:pt-[4.5rem]">
        <TripMap key={mapKey} />
      </div>
      <aside className="absolute bottom-0 right-0 top-[4.25rem] z-10 flex w-full max-w-md flex-col border-l border-atlas-teal/10 bg-white/30 p-3 shadow-[-8px_0_32px_-12px_rgba(12,61,63,0.15)] backdrop-blur-md sm:top-[4.5rem] sm:w-[22rem] sm:p-4">
        <TripDashboardSidePanel onPinSaved={() => setMapKey((k) => k + 1)} />
      </aside>
    </main>
  );
};

export default TripDashboardPage;
