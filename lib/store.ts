/**
 * In-memory booking store. It lives for as long as the server process does
 * and starts with a few sample bookings so the staff view is not empty.
 */
import { randomInt } from "node:crypto";
import { formatMoney, type GelPrice } from "./pricing.ts";
import { buildQuote, DEFAULT_MARGIN_BPS, SAMPLE_RATES } from "./quote.ts";
import { findResort, type Resort } from "./supplier.ts";
import { addDays } from "./dates.ts";
import type { GuestDetails, Stay } from "./validation.ts";

export type BookingStatus = "new" | "confirmed" | "deposit_paid" | "cancelled";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  new: "Awaiting confirmation",
  confirmed: "Confirmed, deposit due",
  deposit_paid: "Deposit paid",
  cancelled: "Cancelled",
};

export interface AuditEntry {
  at: string;
  actor: string;
  from: BookingStatus | null;
  to: BookingStatus;
  note: string;
}

export interface Booking {
  ref: string;
  createdAt: string;
  status: BookingStatus;
  resortId: string;
  resortName: string;
  villa: string;
  stay: Stay;
  guest: GuestDetails;
  price: GelPrice;
  rateAsOf: string;
  depositTetri: number | null;
  audit: AuditEntry[];
}

export type StaffAction = "confirm" | "mark_deposit_paid" | "cancel";

interface Store {
  bookings: Map<string, Booking>;
}

const globalStore = globalThis as typeof globalThis & { __atollDemoStore?: Store };

function store(): Store {
  if (!globalStore.__atollDemoStore) {
    globalStore.__atollDemoStore = { bookings: new Map() };
    seed();
  }
  return globalStore.__atollDemoStore;
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function newRef(existing: Map<string, Booking>): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
    const ref = `AT-${code}`;
    if (!existing.has(ref)) return ref;
  }
}

export function createBooking(input: {
  resort: Resort;
  stay: Stay;
  guest: GuestDetails;
  price: GelPrice;
  rateAsOf: string;
  now?: Date;
  ref?: string;
}): Booking {
  const { bookings } = store();
  const at = (input.now ?? new Date()).toISOString();
  const booking: Booking = {
    ref: input.ref ?? newRef(bookings),
    createdAt: at,
    status: "new",
    resortId: input.resort.id,
    resortName: input.resort.name,
    villa: input.resort.villa,
    stay: input.stay,
    guest: input.guest,
    price: input.price,
    rateAsOf: input.rateAsOf,
    depositTetri: null,
    audit: [{ at, actor: "Customer", from: null, to: "new", note: "Booking request sent from the website." }],
  };
  bookings.set(booking.ref, booking);
  return booking;
}

export function getBooking(ref: string): Booking | undefined {
  return store().bookings.get(ref.toUpperCase());
}

export function listBookings(filter: { q?: string; status?: string } = {}): Booking[] {
  const q = (filter.q ?? "").trim().toLowerCase();
  return [...store().bookings.values()]
    .filter((b) => !filter.status || b.status === filter.status)
    .filter((b) => {
      if (!q) return true;
      const haystack = `${b.ref} ${b.guest.firstName} ${b.guest.lastName} ${b.guest.email} ${b.guest.phone} ${b.resortName}`;
      return haystack.toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type ActionResult = { ok: true; booking: Booking } | { ok: false; status: number; error: string };

/** The only place a booking's status changes. Every change is written to the audit trail. */
export function applyStaffAction(
  ref: string,
  action: StaffAction,
  options: { depositTetri?: number | null; note?: string; now?: Date } = {},
): ActionResult {
  const booking = getBooking(ref);
  if (!booking) return { ok: false, status: 404, error: "No booking has this reference." };
  const at = (options.now ?? new Date()).toISOString();
  const extra = options.note?.trim() ? ` ${options.note.trim()}` : "";
  const from = booking.status;

  if (action === "confirm") {
    if (from !== "new") return { ok: false, status: 409, error: "Only a booking awaiting confirmation can be confirmed." };
    const deposit = options.depositTetri;
    if (deposit == null || !Number.isInteger(deposit) || deposit <= 0) {
      return { ok: false, status: 422, error: "Enter a deposit greater than zero, in lari." };
    }
    if (deposit > booking.price.totalTetri) {
      return { ok: false, status: 422, error: `The deposit cannot be more than the total of ${formatMoney(booking.price.totalTetri, "GEL")}.` };
    }
    booking.status = "confirmed";
    booking.depositTetri = deposit;
    booking.audit.push({ at, actor: "Demo staff", from, to: "confirmed", note: `Deposit set to ${formatMoney(deposit, "GEL")}.${extra}` });
  } else if (action === "mark_deposit_paid") {
    if (from !== "confirmed") return { ok: false, status: 409, error: "Confirm the booking and set a deposit first." };
    booking.status = "deposit_paid";
    booking.audit.push({ at, actor: "Demo staff", from, to: "deposit_paid", note: `Deposit of ${formatMoney(booking.depositTetri ?? 0, "GEL")} received.${extra}` });
  } else if (action === "cancel") {
    if (from === "cancelled") return { ok: false, status: 409, error: "This booking is already cancelled." };
    booking.status = "cancelled";
    booking.audit.push({ at, actor: "Demo staff", from, to: "cancelled", note: `Cancelled by staff.${extra}` });
  } else {
    return { ok: false, status: 400, error: "Unknown action." };
  }
  return { ok: true, booking };
}

function seed(): void {
  const samples: {
    ref: string;
    resortId: string;
    checkIn: string;
    nights: number;
    adults: number;
    children: number;
    guest: GuestDetails;
    created: string;
    then?: { action: StaffAction; depositTetri?: number; at: string }[];
  }[] = [
    {
      ref: "AT-7KQ2MD",
      resortId: "noonglass-water-villas",
      checkIn: "2027-02-14",
      nights: 7,
      adults: 2,
      children: 0,
      guest: { firstName: "Nino", lastName: "Samplidze", email: "nino@example.com", phone: "+995 555 010 203", notes: "Anniversary trip." },
      created: "2026-11-03T08:12:00.000Z",
      then: [
        { action: "confirm", depositTetri: 600_000, at: "2026-11-03T10:40:00.000Z" },
        { action: "mark_deposit_paid", at: "2026-11-05T13:05:00.000Z" },
      ],
    },
    {
      ref: "AT-M4T9XB",
      resortId: "driftlantern-island",
      checkIn: "2027-07-02",
      nights: 10,
      adults: 2,
      children: 2,
      guest: { firstName: "Giorgi", lastName: "Examplashvili", email: "giorgi@example.com", phone: "+995 555 010 417", notes: "Children are 5 and 8." },
      created: "2026-11-09T15:47:00.000Z",
      then: [{ action: "confirm", depositTetri: 450_000, at: "2026-11-10T09:02:00.000Z" }],
    },
    {
      ref: "AT-R8W3HN",
      resortId: "hinavelu-reef-house",
      checkIn: "2027-03-20",
      nights: 5,
      adults: 2,
      children: 0,
      guest: { firstName: "Ana", lastName: "Testadze", email: "ana@example.com", phone: "+995 555 010 588", notes: "" },
      created: "2026-11-18T19:30:00.000Z",
    },
    {
      ref: "AT-C5J6PV",
      resortId: "tidewake-sandbank-lodge",
      checkIn: "2027-05-11",
      nights: 4,
      adults: 1,
      children: 0,
      guest: { firstName: "Luka", lastName: "Demoshvili", email: "luka@example.com", phone: "+995 555 010 764", notes: "" },
      created: "2026-11-12T11:20:00.000Z",
      then: [{ action: "cancel", at: "2026-11-13T08:15:00.000Z" }],
    },
  ];

  for (const sample of samples) {
    const resort = findResort(sample.resortId);
    if (!resort) continue;
    const stay: Stay = {
      checkIn: sample.checkIn,
      checkOut: addDays(sample.checkIn, sample.nights),
      nights: sample.nights,
      adults: sample.adults,
      children: sample.children,
    };
    const quote = buildQuote(resort, stay, DEFAULT_MARGIN_BPS, SAMPLE_RATES);
    createBooking({ resort, stay, guest: sample.guest, price: quote.price, rateAsOf: quote.rates.asOf, now: new Date(sample.created), ref: sample.ref });
    for (const step of sample.then ?? []) {
      applyStaffAction(sample.ref, step.action, { depositTetri: step.depositTetri, now: new Date(step.at) });
    }
  }
}
