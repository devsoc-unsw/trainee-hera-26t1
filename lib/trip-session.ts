export type TripSession = {
  username: string;
  tripId: string;
  tripCode?: string;
};

const STORAGE_KEY = "atlas_trip_session";

export function setTripSession(session: TripSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getTripSession(): TripSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TripSession>;
    if (
      typeof parsed.username === "string" &&
      typeof parsed.tripId === "string"
    ) {
      return {
        username: parsed.username,
        tripId: parsed.tripId,
        tripCode:
          typeof parsed.tripCode === "string" ? parsed.tripCode : undefined,
      };
    }
  } catch {
    // ignore invalid JSON
  }

  return null;
}

export function clearTripSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
