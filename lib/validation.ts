/**
 * Validation shared by the browser and the server. The browser uses it for
 * early feedback; the server runs it again and is the one that counts.
 */
import { nightsBetween, parseIsoDate } from "./dates.ts";

export const MAX_NIGHTS = 21;
export const MAX_ADULTS = 6;
export const MAX_CHILDREN = 4;

export interface Stay {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
}

export type Errors = Record<string, string>;

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Errors };

function toWholeNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value === "string" && /^\d{1,3}$/.test(value.trim())) return Number(value.trim());
  return null;
}

export function validateStay(
  input: { checkIn: unknown; checkOut: unknown; adults: unknown; children: unknown },
  options: { today: string; maxGuests?: number },
): Result<Stay> {
  const errors: Errors = {};
  const inMs = parseIsoDate(input.checkIn);
  const outMs = parseIsoDate(input.checkOut);

  if (inMs === null) {
    errors.checkIn = "Choose a check-in date.";
  } else if ((input.checkIn as string) <= options.today) {
    errors.checkIn = "Check-in must be after today.";
  }

  if (outMs === null) {
    errors.checkOut = "Choose a check-out date.";
  } else if (inMs !== null) {
    const nights = nightsBetween(input.checkIn as string, input.checkOut as string);
    if (nights < 1) errors.checkOut = "Check-out must be after check-in.";
    else if (nights > MAX_NIGHTS) errors.checkOut = `Stays are limited to ${MAX_NIGHTS} nights.`;
  }

  const adults = toWholeNumber(input.adults);
  const children = toWholeNumber(input.children);
  if (adults === null || adults < 1 || adults > MAX_ADULTS) {
    errors.adults = `Choose between 1 and ${MAX_ADULTS} adults.`;
  }
  if (children === null || children < 0 || children > MAX_CHILDREN) {
    errors.children = `Choose between 0 and ${MAX_CHILDREN} children.`;
  }
  if (
    options.maxGuests !== undefined &&
    adults !== null &&
    children !== null &&
    !errors.adults &&
    !errors.children &&
    adults + children > options.maxGuests
  ) {
    errors.adults = `This villa sleeps up to ${options.maxGuests} guests.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const checkIn = input.checkIn as string;
  const checkOut = input.checkOut as string;
  return {
    ok: true,
    value: {
      checkIn,
      checkOut,
      adults: adults as number,
      children: children as number,
      nights: nightsBetween(checkIn, checkOut),
    },
  };
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

const NAME = /^[\p{L}][\p{L}\p{M}' .-]{0,58}[\p{L}.]$/u;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateGuest(input: Record<string, unknown>): Result<GuestDetails> {
  const errors: Errors = {};
  const firstName = text(input.firstName);
  const lastName = text(input.lastName);
  const email = text(input.email);
  const phone = text(input.phone);
  const notes = text(input.notes);

  if (!firstName) errors.firstName = "Enter the first name as it appears on the passport.";
  else if (!NAME.test(firstName)) errors.firstName = "Use letters only, at least two.";

  if (!lastName) errors.lastName = "Enter the last name as it appears on the passport.";
  else if (!NAME.test(lastName)) errors.lastName = "Use letters only, at least two.";

  if (!email) errors.email = "Enter an email address so we can send the confirmation.";
  else if (email.length > 254 || !EMAIL.test(email)) {
    errors.email = "This does not look like an email address. Check for a missing @ or dot.";
  }

  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Enter a phone number we can reach you on.";
  else if (!/^\+?[\d\s()-]+$/.test(phone)) {
    errors.phone = "Use digits, spaces and an optional leading +.";
  } else if (digits.length < 9 || digits.length > 15) {
    errors.phone = "A phone number has 9 to 15 digits, including the country code.";
  }

  if (notes.length > 500) errors.notes = "Keep the note under 500 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { firstName, lastName, email: email.toLowerCase(), phone, notes } };
}
