import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import type { RoleFilter } from "@/components/trip-dashboard/types";

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
