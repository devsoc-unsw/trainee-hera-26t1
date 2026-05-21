"use client";

import { useState } from "react";
import { DriverPassengerSwitch } from "@/components/driver-passenger-switch";
import { DriverSeatsForm } from "@/components/driver-seats-form";
import { LeaveTripPanel } from "@/components/leave-trip-panel";
import { ParticipantPinForm } from "@/components/participant-pin-form";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { UpdatePasswordPanel } from "@/components/update-password-panel";

type PersonalInfoPanelProps = {
  onPinSaved?: () => void;
  isAdmin?: boolean;
  adminCount?: number;
};

export function PersonalInfoPanel({
  onPinSaved,
  isAdmin = false,
  adminCount = 0,
}: PersonalInfoPanelProps) {
  const [isDriver, setIsDriver] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className={dashboardSectionClass}>
        <ParticipantPinForm onSaved={onPinSaved} />
      </div>

      <div className={dashboardSectionClass}>
        <DriverPassengerSwitch onRoleChange={setIsDriver} />
        {isDriver && (
          <div className="mt-4 border-t border-atlas-teal/10 pt-4">
            <DriverSeatsForm isDriver={isDriver} />
          </div>
        )}
      </div>

      <div className={`${dashboardSectionClass} !p-0`}>
        <UpdatePasswordPanel />
      </div>

      <div className={`${dashboardSectionClass} !p-0`}>
        <LeaveTripPanel isAdmin={isAdmin} adminCount={adminCount} />
      </div>
    </div>
  );
}
