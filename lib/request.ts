/** Server-side helpers for reading the request: display currency, demo staff flag, stay parameters. */
import { cookies } from "next/headers";
import { addDays, todayIso } from "./dates.ts";
import { CURRENCIES, type Currency } from "./pricing.ts";
import { validateStay, type Result, type Stay } from "./validation.ts";

export const CURRENCY_COOKIE = "currency";
export const STAFF_COOKIE = "demo_staff";

export async function getCurrency(): Promise<Currency> {
  const value = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : "GEL";
}

export async function isDemoStaff(): Promise<boolean> {
  return (await cookies()).get(STAFF_COOKIE)?.value === "1";
}

export type SearchParams = Record<string, string | string[] | undefined>;

export interface StayFields {
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Stay fields from the query string, with defaults: six weeks out, five nights, two adults. */
export function readStay(params: SearchParams, maxGuests?: number): { fields: StayFields; result: Result<Stay>; today: string } {
  const today = todayIso();
  const checkIn = first(params.in) ?? addDays(today, 42);
  let checkOut = first(params.out);
  if (!checkOut) {
    try {
      checkOut = addDays(checkIn, 5);
    } catch {
      checkOut = "";
    }
  }
  const fields: StayFields = {
    checkIn,
    checkOut,
    adults: first(params.adults) ?? "2",
    children: first(params.children) ?? "0",
  };
  return { fields, result: validateStay(fields, { today, maxGuests }), today };
}

export function stayQuery(fields: StayFields): string {
  return new URLSearchParams({
    in: fields.checkIn,
    out: fields.checkOut,
    adults: fields.adults,
    children: fields.children,
  }).toString();
}
