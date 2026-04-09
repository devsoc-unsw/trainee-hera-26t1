import MapArea from "@/components/map-area";
import { TripDashboardSidePanel } from "@/components/trip-dashboard";

const TripDashboardPage = () => {
  return (
    <main>
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <MapArea />
        </div>
        <div style={{ width: "300px" }}>
          <TripDashboardSidePanel />
        </div>
      </div>
    </main>
  );
}

export default TripDashboardPage;