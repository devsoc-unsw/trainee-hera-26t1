export type DrivingGroup = {
  id: string;
  name: string | null;
  color: string;
  driver: {
    username: string;
    seats: number | null;
  } | null;
  passengers: {
    username: string;
    order: number;
  }[];
};

export function groupDisplayName(group: DrivingGroup): string {
  return group.name?.trim() || `Group ${group.id.slice(0, 8)}`;
}

export function isDrivingGroupFull(
  group: DrivingGroup,
  excludeUsername?: string,
): boolean {
  const seats = group.driver?.seats ?? 0;
  const passengerCount = group.passengers.filter(
    (p) => p.username !== excludeUsername,
  ).length;
  return passengerCount >= seats;
}

export function passengerCountLabel(group: DrivingGroup): string {
  const seats = group.driver?.seats ?? 0;
  const count = group.passengers.length;
  return `${count}/${seats} passengers`;
}
