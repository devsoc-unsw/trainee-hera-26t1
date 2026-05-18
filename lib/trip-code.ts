import { randomInt } from "crypto";

const TRIP_CODE_PATTERN = /^[A-Za-z0-9]+$/;
const TRIP_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const TRIP_CODE_DIGITS = "23456789";
const TRIP_CODE_CHARS = TRIP_CODE_LETTERS + TRIP_CODE_DIGITS;

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

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Exactly 6 characters: letters and numbers, with at least one of each. */
export function generateTripCode(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = shuffle([
      TRIP_CODE_LETTERS[randomInt(TRIP_CODE_LETTERS.length)],
      TRIP_CODE_DIGITS[randomInt(TRIP_CODE_DIGITS.length)],
      TRIP_CODE_CHARS[randomInt(TRIP_CODE_CHARS.length)],
      TRIP_CODE_CHARS[randomInt(TRIP_CODE_CHARS.length)],
      TRIP_CODE_CHARS[randomInt(TRIP_CODE_CHARS.length)],
      TRIP_CODE_CHARS[randomInt(TRIP_CODE_CHARS.length)],
    ]).join("");

    if (code.length === 6 && !validateTripCode(code)) {
      return code;
    }
  }

  throw new Error("Failed to generate trip code");
}
