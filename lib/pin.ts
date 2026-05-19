export type PinSelection = {
  address: string;
  latitude: number;
  longitude: number;
};

export function isValidPin(pin: PinSelection | null): pin is PinSelection {
  if (!pin) return false;
  return (
    pin.address.trim().length > 0 &&
    Number.isFinite(pin.latitude) &&
    Number.isFinite(pin.longitude)
  );
}
