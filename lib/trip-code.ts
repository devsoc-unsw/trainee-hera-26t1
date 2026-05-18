const TRIP_CODE_PATTERN = /^[A-Za-z0-9]+$/;

export function validateTripCode(code: string): string | null {
  const trimmed = code.trim();

  if (trimmed.length < 6) {
    return "Invite code must be at least 6 characters";
  }

  if (!TRIP_CODE_PATTERN.test(trimmed)) {
    return "Invite code can only contain letters and numbers";
  }

  if (!/[A-Za-z]/.test(trimmed) || !/\d/.test(trimmed)) {
    return "Invite code must include at least one letter and one number";
  }

  return null;
}

export function sanitizeTripCodeInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "");
}
