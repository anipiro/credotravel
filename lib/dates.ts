/** Calendar-date helpers. Dates are "YYYY-MM-DD" strings handled in UTC. */

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseIsoDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  // Reject dates such as 2027-02-31 that Date.parse would roll over.
  return toIsoDate(ms) === value ? ms : null;
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const ms = parseIsoDate(iso);
  if (ms === null) throw new RangeError(`Not a date: ${iso}`);
  return toIsoDate(ms + days * DAY_MS);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = parseIsoDate(checkIn);
  const b = parseIsoDate(checkOut);
  if (a === null || b === null) return NaN;
  return Math.round((b - a) / DAY_MS);
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** "2027-01-12" -> "12 Jan 2027" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ISO timestamp -> "12 Jan 2027, 09:30 UTC" */
export function formatDateTime(isoTimestamp: string): string {
  return `${formatDate(isoTimestamp.slice(0, 10))}, ${isoTimestamp.slice(11, 16)} UTC`;
}
