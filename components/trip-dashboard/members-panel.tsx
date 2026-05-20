import { Car } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { AdminAddUser } from "@/components/trip-dashboard/admin-add-user";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import {
  DashboardFilterChip,
  DashboardSectionHeading,
} from "@/components/trip-dashboard/dashboard-ui";
import { MemberRow } from "@/components/trip-dashboard/member-row";
import type { RoleFilter } from "@/components/trip-dashboard/types";

type MembersPanelProps = {
  members: TripMapParticipant[];
  isLoading: boolean;
  roleFilter: RoleFilter;
  onRoleFilterChange: (filter: RoleFilter) => void;
  driverCount: number;
  passengerCount: number;
  totalCount: number;
  // Admin-only "add a member" form is rendered below the list when these are
  // provided. Pass undefined / isAdmin=false for non-admins to hide it.
  isAdmin?: boolean;
  tripId?: string;
  tripCode?: string;
  onMemberAdded?: () => void;
};

export function MembersPanel({
  members,
  isLoading,
  roleFilter,
  onRoleFilterChange,
  driverCount,
  passengerCount,
  totalCount,
  isAdmin,
  tripId,
  tripCode,
  onMemberAdded,
}: MembersPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className={dashboardSectionClass}>
        <DashboardSectionHeading
          title="People on this trip"
          description={`${totalCount} total · ${driverCount} drivers · ${passengerCount} passengers`}
        />

        <div
          className="mb-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by role"
        >
          <DashboardFilterChip
            active={roleFilter === "all"}
            onClick={() => onRoleFilterChange("all")}
          >
            All ({totalCount})
          </DashboardFilterChip>
          <DashboardFilterChip
            active={roleFilter === "drivers"}
            onClick={() => onRoleFilterChange("drivers")}
          >
            <span className="inline-flex items-center gap-1">
              <Car className="size-3" aria-hidden />
              Drivers ({driverCount})
            </span>
          </DashboardFilterChip>
          <DashboardFilterChip
            active={roleFilter === "passengers"}
            onClick={() => onRoleFilterChange("passengers")}
          >
            Passengers ({passengerCount})
          </DashboardFilterChip>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500">
            No members match this filter.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.username}>
                <MemberRow member={member} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && tripId && tripCode && (
        <AdminAddUser
          tripId={tripId}
          tripCode={tripCode}
          onAdded={onMemberAdded}
        />
      )}
    </div>
  );
}
