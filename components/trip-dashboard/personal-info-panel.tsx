import { DriverPassengerSwitch } from "@/components/driver-passenger-switch";
import { LeaveTripPanel } from "@/components/leave-trip-panel";
import { ParticipantPinForm } from "@/components/participant-pin-form";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { UpdatePasswordPanel } from "@/components/update-password-panel";

type PersonalInfoPanelProps = {
  onPinSaved?: () => void;
};

export function PersonalInfoPanel({ onPinSaved }: PersonalInfoPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className={dashboardSectionClass}>
        <ParticipantPinForm onSaved={onPinSaved} />
      </div>

      <div className={dashboardSectionClass}>
        <DriverPassengerSwitch />
      </div>

      <div className={`${dashboardSectionClass} !p-0`}>
        <UpdatePasswordPanel />
      </div>

      <div className={`${dashboardSectionClass} !p-0`}>
        <LeaveTripPanel />
      </div>
    </div>
  );
}
