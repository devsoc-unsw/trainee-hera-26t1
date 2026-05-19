"use client";

import { useState } from "react";
import { TripMap } from "@/components/trip-map";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  const [mapKey, setMapKey] = useState(0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-atlas-mist/40 to-white p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-h-[420px] flex-1">
          <TripMap key={mapKey} />
        </div>
        <aside className="w-full shrink-0 lg:w-80">
          <TripDashboardSidePanel onPinSaved={() => setMapKey((k) => k + 1)} />
        </aside>
      </div>
    </main>
  );
};

export default TripDashboardPage;
