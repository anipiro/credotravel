/**
 * Joins the supplier and the pricing module: a stay goes in, a customer
 * price in lari comes out, with every input that produced it kept alongside.
 * Both the pages and the booking endpoint call this, so the price a customer
 * sees and the price the server stores come from the same code.
 */
import {
  convertFromGel,
  perGuestNight,
  priceInGel,
  type Currency,
  type GelPrice,
  type RateTable,
} from "./pricing.ts";
import { supplierQuote, type Resort, type SupplierQuote } from "./supplier.ts";

/** Agency margin in basis points. 1200 = 12%. Override with AGENCY_MARGIN_BPS. */
export const DEFAULT_MARGIN_BPS = 1_200;

export function agencyMarginBps(): number {
  const raw = Number(process.env.AGENCY_MARGIN_BPS);
  return Number.isInteger(raw) && raw >= 0 && raw <= 10_000 && process.env.AGENCY_MARGIN_BPS
    ? raw
    : DEFAULT_MARGIN_BPS;
}

/** A fixed sample table. A real site would read the day's rate when quoting. */
export const SAMPLE_RATES: RateTable = {
  asOf: "2026-11-02",
  gelPerUnitE4: { USD: 27_150, EUR: 29_480 },
};

export interface Quote {
  supplier: SupplierQuote;
  price: GelPrice;
  rates: RateTable;
  guests: number;
}

export function buildQuote(
  resort: Resort,
  stay: { checkIn: string; nights: number; adults: number; children: number },
  marginBps: number = agencyMarginBps(),
  rates: RateTable = SAMPLE_RATES,
): Quote {
  const supplier = supplierQuote(resort, stay);
  const price = priceInGel({
    supplierUsdCents: supplier.totalUsdCents,
    marginBps,
    gelPerUsdE4: rates.gelPerUnitE4.USD,
  });
  return { supplier, price, rates, guests: stay.adults + stay.children };
}

/** The quote's total and per-night guide figure in the chosen display currency. */
export function displayAmounts(quote: Quote, currency: Currency): { total: number; perGuestNight: number } {
  const total = convertFromGel(quote.price.totalTetri, currency, quote.rates);
  return { total, perGuestNight: perGuestNight(total, quote.supplier.nights, quote.guests) };
}
