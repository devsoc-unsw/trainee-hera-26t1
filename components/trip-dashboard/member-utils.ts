import type {
  TripMapLocation,
  TripMapParticipant,
} from "@/app/api/trips/map-locations/route";
import type { RoleFilter } from "@/components/trip-dashboard/types";

export function hasMapCoords(
  loc: TripMapLocation | null | undefined,
): loc is TripMapLocation & { latitude: number; longitude: number } {
  return (
    loc != null &&
    loc.latitude != null &&
    loc.longitude != null &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude)
  );
}

export function memberHasMapPin(member: TripMapParticipant): boolean {
  return hasMapCoords(member.location);
}

export function sortMembers(members: TripMapParticipant[]): TripMapParticipant[] {
  return [...members].sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
    return a.username.localeCompare(b.username);
  });
}

export function filterMembers(
  members: TripMapParticipant[],
  filter: RoleFilter,
): TripMapParticipant[] {
  if (filter === "drivers") {
    return members.filter((m) => m.is_driver);
  }
  if (filter === "passengers") {
    return members.filter((m) => !m.is_driver);
  }
  return members;
}
