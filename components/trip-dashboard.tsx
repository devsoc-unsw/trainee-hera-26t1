"use client";

import { useState } from "react";
import { DriverPassengerSwitch } from "@/components/driver-passenger-switch";
import { LeaveTripPanel } from "@/components/leave-trip-panel";
import { ParticipantPinForm } from "@/components/participant-pin-form";
import { UpdatePasswordPanel } from "@/components/update-password-panel";

type View =
  | "main"
  | "trip-info"
  | "members"
  | "group-info"
  | "admin"
  | "leave"
  | "account";

export const TripDashboardSidePanel = ({
  onPinSaved,
}: {
  onPinSaved?: () => void;
}) => {
  const [activeView, setActiveView] = useState<View>("main");

  return (
    <div>
      <div>
        <button onClick={() => setActiveView("main")}>Main View</button>
        <button onClick={() => setActiveView("trip-info")}>Trip Info</button>
        <button onClick={() => setActiveView("members")}>All Members</button>
        <button onClick={() => setActiveView("group-info")}>Group Info</button>
        <button onClick={() => setActiveView("admin")}>Admin Features</button>
        <button onClick={() => setActiveView("leave")}>Leave Trip</button>
        <button onClick={() => setActiveView("account")}>Account</button>
      </div>

      <div>
        {activeView === "main" && <MainView onPinSaved={onPinSaved} />}
        {activeView === "trip-info" && <TripInfoView />}
        {activeView === "members" && <MembersView />}
        {activeView === "group-info" && <GroupInfoView />}
        {activeView === "admin" && <AdminView />}
        {activeView === "leave" && <LeaveTripPanel />}
        {activeView === "account" && <UpdatePasswordPanel />}
      </div>
    </div>
  );
};

const MainView = ({ onPinSaved }: { onPinSaved?: () => void }) => {
  return (
    <div className="flex flex-col gap-4">
      <ParticipantPinForm onSaved={onPinSaved} />
      <DriverPassengerSwitch />
    </div>
  );
};

const TripInfoView = () => {
  return <div>Trip Info View Content</div>;
};

const MembersView = () => {
  return <div>All Members View Content</div>;
};

const GroupInfoView = () => {
  return <div>Group Info View Content</div>;
};

const AdminView = () => {
  return <div>Admin Features View Content</div>;
};
