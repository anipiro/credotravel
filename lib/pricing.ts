/**
 * Pricing: supplier quote in US dollars -> customer price in Georgian lari.
 *
 * Everything here is a pure function over integers. Money is held in minor
 * units (cents, tetri) and rates in ten-thousandths, so no step depends on
 * floating point.
 *
 * The pipeline:
 *
 *   1. The supplier quotes a total in USD cents (taxes included).
 *   2. The agency margin is added as a percentage, given in basis points
 *      (1200 = 12%).
 *   3. The result is converted to lari at the rate captured at quote time.
 *   4. The exact figure is rounded DOWN to a whole lari. That is the price.
 *
 * The rounding rule, stated once:
 *
 *   The customer's total is the largest whole number of lari that does not
 *   exceed supplier price x (1 + margin) x rate. Steps 2 and 3 are carried
 *   exactly (as one integer fraction) and only the final figure is rounded,
 *   once, downwards. The customer therefore never pays more than the
 *   unrounded figure, and the agency gives up less than 1 lari per booking.
 *
 * Dollar and euro figures shown on the site are not separate prices. They
 * are the same lari total converted back at the same rate table and rounded
 * down to the cent, so the three currencies cannot disagree and no displayed
 * figure is worth more than the lari amount that is actually charged.
 */

export type Currency = "GEL" | "USD" | "EUR";

export const CURRENCIES: readonly Currency[] = ["GEL", "USD", "EUR"];

/** Lari per one unit of foreign currency, times 10,000 (2.7150 -> 27150). */
export interface RateTable {
  asOf: string;
  gelPerUnitE4: { USD: number; EUR: number };
}

export interface GelPriceInput {
  supplierUsdCents: number;
  marginBps: number;
  gelPerUsdE4: number;
}

export interface GelPrice {
  supplierUsdCents: number;
  marginBps: number;
  gelPerUsdE4: number;
  /** Supplier price plus margin, still in dollars, to four decimals. For staff. */
  withMarginUsd: string;
  /** The exact lari figure before rounding, truncated to four decimals. */
  unroundedGel: string;
  /** The price charged, in tetri. Always a whole number of lari. */
  totalTetri: number;
  /** What rounding down gave away, in tetri (0 to just under 100). */
  roundedOffTetri: number;
}

const BPS = 10_000n;
const RATE_SCALE = 10_000n;

function assertInteger(name: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a whole number between ${min} and ${max}, got ${value}`);
  }
}

function fixed4(scaledE4: bigint): string {
  const whole = scaledE4 / 10_000n;
  const frac = (scaledE4 % 10_000n).toString().padStart(4, "0");
  return `${whole}.${frac}`;
}

/**
 * Supplier dollars -> lari total. See the rounding rule at the top of the file.
 *
 * exact tetri = cents x (10000 + marginBps) x rateE4 / (10000 x 10000)
 */
export function priceInGel(input: GelPriceInput): GelPrice {
  const { supplierUsdCents, marginBps, gelPerUsdE4 } = input;
  assertInteger("supplierUsdCents", supplierUsdCents, 0, 1_000_000_000);
  assertInteger("marginBps", marginBps, 0, 10_000);
  assertInteger("gelPerUsdE4", gelPerUsdE4, 1, 10_000_000);

  const withMarginNumerator = BigInt(supplierUsdCents) * (BPS + BigInt(marginBps));
  // Numerator of the exact price in tetri, over a denominator of 10^8.
  const tetriNumerator = withMarginNumerator * BigInt(gelPerUsdE4);
  const tetriDenominator = BPS * RATE_SCALE;

  const wholeLari = tetriNumerator / (tetriDenominator * 100n); // BigInt division floors
  const totalTetri = Number(wholeLari) * 100;

  // Exact figure in ten-thousandths of a lari, for display only.
  const unroundedE4 = tetriNumerator / 1_000_000n;
  const roundedOffTetri = Number(tetriNumerator / tetriDenominator) - totalTetri;

  return {
    supplierUsdCents,
    marginBps,
    gelPerUsdE4,
    withMarginUsd: fixed4(withMarginNumerator / 100n),
    unroundedGel: fixed4(unroundedE4),
    totalTetri,
    roundedOffTetri,
  };
}

/**
 * The lari total expressed in another currency, in minor units.
 * Derived from the lari amount (never from the supplier's dollars) and
 * rounded down to the cent.
 */
export function convertFromGel(tetri: number, currency: Currency, rates: RateTable): number {
  assertInteger("tetri", tetri, 0, Number.MAX_SAFE_INTEGER);
  if (currency === "GEL") return tetri;
  const rateE4 = rates.gelPerUnitE4[currency];
  assertInteger("rate", rateE4, 1, 10_000_000);
  return Number((BigInt(tetri) * RATE_SCALE) / BigInt(rateE4));
}

/**
 * Average per night, per guest, in minor units, rounded to the nearest whole
 * unit of the currency. This is a guide figure for comparing resorts; the
 * total is the amount that is charged.
 */
export function perGuestNight(totalMinor: number, nights: number, guests: number): number {
  assertInteger("totalMinor", totalMinor, 0, Number.MAX_SAFE_INTEGER);
  assertInteger("nights", nights, 1, 365);
  assertInteger("guests", guests, 1, 100);
  const divisor = nights * guests * 100;
  return Math.floor((totalMinor + divisor / 2) / divisor) * 100;
}

/** Suggested deposit: a percentage of the total, rounded down to a whole lari. */
export function suggestedDepositTetri(totalTetri: number, percent = 30): number {
  assertInteger("totalTetri", totalTetri, 0, Number.MAX_SAFE_INTEGER);
  assertInteger("percent", percent, 0, 100);
  return Math.floor((totalTetri * percent) / 10_000) * 100;
}

const SYMBOL: Record<Currency, string> = { GEL: "₾", USD: "$", EUR: "€" };

/**
 * "12,480 ₾", "$4,596.68", "€4,233.37". The lari sign follows the number, as
 * it is written in Georgia. Decimals are dropped when they are zero.
 */
export function formatMoney(minor: number, currency: Currency): string {
  assertInteger("minor", minor, 0, Number.MAX_SAFE_INTEGER);
  const major = Math.floor(minor / 100);
  const frac = minor % 100;
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const number = frac === 0 ? grouped : `${grouped}.${frac.toString().padStart(2, "0")}`;
  return currency === "GEL" ? `${number} ${SYMBOL.GEL}` : `${SYMBOL[currency]}${number}`;
}

/** Parses staff input such as "1500" or "1500.50" into tetri. Null if malformed. */
export function parseGelInput(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
