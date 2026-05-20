"use client";

import { useState } from "react";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { TripMap } from "@/components/trip-map";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [focusUsername, setFocusUsername] = useState<string | null>(null);

  const invalidateTripData = () => {
    setDataRefreshKey((k) => k + 1);
    setFocusUsername(null);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <DashboardNavbar />
      <div className="absolute inset-0 pt-[4.25rem] sm:pt-[4.5rem]">
        <TripMap
          refreshKey={dataRefreshKey}
          focusUsername={focusUsername}
        />
      </div>
      <aside className="absolute bottom-0 right-0 top-[4.25rem] z-10 flex w-full max-w-md flex-col border-l border-atlas-teal/10 bg-white/30 p-3 shadow-[-8px_0_32px_-12px_rgba(12,61,63,0.15)] backdrop-blur-md sm:top-[4.5rem] sm:w-[22rem] sm:p-4">
        <TripDashboardSidePanel
          onDataChange={invalidateTripData}
          focusUsername={focusUsername}
          onMemberFocus={setFocusUsername}
        />
      </aside>
    </main>
  );
};

export default TripDashboardPage;
