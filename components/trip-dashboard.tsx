"use client";

import { useState } from "react";
import { DriverPassengerSwitch } from "@/components/driver-passenger-switch";

export const TripDashboardSidePanel = () => {
  const [activeView, setActiveView] = useState<
    "main" | "trip-info" | "members" | "group-info" | "admin"
  >("main");

  return (
    <div>
      <div>
        <button onClick={() => setActiveView("main")}>Main View</button>
        <button onClick={() => setActiveView("trip-info")}>Trip Info</button>
        <button onClick={() => setActiveView("members")}>All Members</button>
        <button onClick={() => setActiveView("group-info")}>Group Info</button>
        <button onClick={() => setActiveView("admin")}>Admin Features</button>
      </div>

      <div>
        {activeView === "main" && <MainView />}
        {activeView === "trip-info" && <TripInfoView />}
        {activeView === "members" && <MembersView />}
        {activeView === "group-info" && <GroupInfoView />}
        {activeView === "admin" && <AdminView />}
      </div>
    </div>
  );
};

const MainView = () => {
  return (
    <div className="flex flex-col gap-4">
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
