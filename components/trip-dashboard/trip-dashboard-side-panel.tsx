"use client";

import { useCallback, useMemo, useState } from "react";
import { Info, User, Users, UsersRound } from "lucide-react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardNavTab } from "@/components/trip-dashboard/dashboard-ui";
import { DrivingGroupsPanel } from "@/components/trip-dashboard/driving-groups-panel";
import {
  filterMembers,
  sortMembers,
} from "@/components/trip-dashboard/member-utils";
import { MembersPanel } from "@/components/trip-dashboard/members-panel";
import { PersonalInfoPanel } from "@/components/trip-dashboard/personal-info-panel";
import { TripDashboardHeader } from "@/components/trip-dashboard/trip-dashboard-header";
import { TripInfoPanel } from "@/components/trip-dashboard/trip-info-panel";
import type { RoleFilter, SidebarTab } from "@/components/trip-dashboard/types";
import { useTripDashboardData } from "@/components/trip-dashboard/use-trip-dashboard-data";

export function TripDashboardSidePanel({
  onDataChange,
  focusUsername,
  onMemberFocus,
  onDestinationFocus,
}: {
  /** Bumps map + refetches sidebar trip data (members, groups, etc.). */
  onDataChange?: () => void;
  focusUsername?: string | null;
  onMemberFocus?: (username: string) => void;
  onDestinationFocus?: () => void;
}) {
  const { session, trip, me, members, isLoading, error, refresh } =
    useTripDashboardData();
  const [activeTab, setActiveTab] = useState<SidebarTab>("trip-info");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const invalidateTripData = useCallback(() => {
    void refresh();
    onDataChange?.();
  }, [refresh, onDataChange]);

  const filteredMembers = useMemo(
    () => filterMembers(sortMembers(members), roleFilter),
    [members, roleFilter],
  );

  const driverCount = members.filter((m) => m.is_driver).length;
  const passengerCount = members.length - driverCount;

  if (!session) {
    return (
      <div className={dashboardSectionClass}>
        <p className="text-sm text-slate-600">
          Join a trip from the home page to see your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TripDashboardHeader trip={trip} me={me} isLoading={isLoading} />

      <nav className="grid grid-cols-2 gap-2" aria-label="Dashboard sections">
        <DashboardNavTab
          active={activeTab === "trip-info"}
          onClick={() => setActiveTab("trip-info")}
          icon={Info}
          label="Trip info"
        />
        <DashboardNavTab
          active={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
          icon={User}
          label="Personal"
        />
        <DashboardNavTab
          active={activeTab === "members"}
          onClick={() => setActiveTab("members")}
          icon={Users}
          label="People"
        />
        <DashboardNavTab
          active={activeTab === "groups"}
          onClick={() => setActiveTab("groups")}
          icon={UsersRound}
          label="Groups"
        />
      </nav>

      {error && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {activeTab === "trip-info" && (
          <TripInfoPanel
            trip={trip}
            me={me}
            isLoading={isLoading}
            memberCount={members.length}
            onTripUpdated={invalidateTripData}
            onDestinationFocus={onDestinationFocus}
          />
        )}
        {activeTab === "personal" && (
          <PersonalInfoPanel onPinSaved={invalidateTripData} />
        )}
        {activeTab === "members" && (
          <MembersPanel
            members={filteredMembers}
            isLoading={isLoading}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            driverCount={driverCount}
            passengerCount={passengerCount}
            totalCount={members.length}
            isAdmin={me?.is_admin ?? false}
            tripId={trip?.id}
            tripCode={trip?.trip_code ?? undefined}
            allMembers={members}
            currentUsername={me?.username}
            onMemberAdded={invalidateTripData}
            onMemberRemoved={invalidateTripData}
            focusUsername={focusUsername}
            onMemberFocus={onMemberFocus}
          />
        )}
        {activeTab === "groups" && (
          <DrivingGroupsPanel onGroupsFormed={invalidateTripData} />
        )}
      </div>
    </div>
  );
}
