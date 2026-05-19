"use client";

import { useState } from "react";
import { TripMap } from "@/components/trip-map";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  const [mapKey, setMapKey] = useState(0);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <TripMap key={mapKey} />
      </div>
      <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-atlas-teal/10 bg-white/92 p-4 shadow-xl backdrop-blur-md sm:right-4 sm:top-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-80 sm:rounded-2xl sm:border">
        <TripDashboardSidePanel onPinSaved={() => setMapKey((k) => k + 1)} />
      </aside>
    </main>
  );
};

export default TripDashboardPage;
