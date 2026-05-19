import { UsersRound } from "lucide-react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { DashboardSectionHeading } from "@/components/trip-dashboard/dashboard-ui";

export function DrivingGroupsPanel() {
  return (
    <div className={dashboardSectionClass}>
      <DashboardSectionHeading
        title="Driving groups"
        description="Car pools and group assignments will appear here soon."
      />
      <div className="rounded-2xl border border-dashed border-atlas-teal/25 bg-atlas-mist/30 px-4 py-8 text-center">
        <UsersRound
          className="mx-auto size-8 text-atlas-teal/50"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium text-atlas-teal">Coming soon</p>
        <p className="mt-1 text-xs text-slate-500">
          You&apos;ll be able to view and manage driving groups from this tab.
        </p>
      </div>
    </div>
  );
}
