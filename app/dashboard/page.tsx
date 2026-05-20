"use client";

import { useMemo, useState } from "react";
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { MemberDetailPopup } from "@/components/trip-dashboard/member-detail-popup";
import { memberHasMapPin } from "@/components/trip-dashboard/member-utils";
import { useTripDashboardData } from "@/components/trip-dashboard/use-trip-dashboard-data";
import { TripMap } from "@/components/trip-map";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  const { session, trip, me, members, isLoading, error, refresh } =
    useTripDashboardData();
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [focusUsername, setFocusUsername] = useState<string | null>(null);
  const [focusDestination, setFocusDestination] = useState(false);

  const selectedMember = useMemo(
    () => members.find((m) => m.username === selectedUsername) ?? null,
    [members, selectedUsername],
  );

  const invalidateTripData = () => {
    setDataRefreshKey((k) => k + 1);
    void refresh();
    setFocusUsername(null);
    setFocusDestination(false);
  };

  const selectMember = (username: string) => {
    setSelectedUsername(username);
    const member = members.find((m) => m.username === username);
    if (member && memberHasMapPin(member)) {
      setFocusUsername(username);
    } else {
      setFocusUsername(null);
    }
    setFocusDestination(false);
  };

  const closeMemberDetail = () => {
    setSelectedUsername(null);
    setFocusUsername(null);
  };

  const focusDestinationOnMap = () => {
    setFocusDestination(true);
    setFocusUsername(null);
    setSelectedUsername(null);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <DashboardNavbar />
      <div className="absolute inset-0 pt-[4.25rem] sm:pt-[4.5rem]">
        <TripMap
          refreshKey={dataRefreshKey}
          focusUsername={focusUsername}
          focusDestination={focusDestination}
          selectedUsername={selectedUsername}
          onMemberSelect={selectMember}
        />
        {selectedMember && trip?.id && (
          <MemberDetailPopup
            member={selectedMember}
            isAdmin={me?.is_admin ?? false}
            tripId={trip.id}
            tripCode={trip.trip_code}
            onClose={closeMemberDetail}
            onUpdated={invalidateTripData}
          />
        )}
      </div>
      <aside className="absolute bottom-0 right-0 top-[4.25rem] z-10 flex w-full max-w-md flex-col border-l border-atlas-teal/10 bg-white/30 p-3 shadow-[-8px_0_32px_-12px_rgba(12,61,63,0.15)] backdrop-blur-md sm:top-[4.5rem] sm:w-[22rem] sm:p-4">
        <TripDashboardSidePanel
          session={session}
          trip={trip}
          me={me}
          members={members}
          isLoading={isLoading}
          error={error}
          onDataChange={invalidateTripData}
          selectedUsername={selectedUsername}
          onMemberSelect={selectMember}
          onDestinationFocus={focusDestinationOnMap}
        />
      </aside>
    </main>
  );
};

export default TripDashboardPage;
