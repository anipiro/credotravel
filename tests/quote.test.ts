import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuote, displayAmounts, SAMPLE_RATES } from "../lib/quote.ts";
import { RESORTS, seasonPercent, supplierQuote, type Resort } from "../lib/supplier.ts";

const resort: Resort = {
  id: "test-island",
  name: "Test Island",
  atollId: "sunaru",
  villa: "Villa",
  summary: "",
  transfer: "",
  highlights: [],
  maxGuests: 6,
  adultNightUsdCents: 20_000,
  childPercent: 50,
  seed: 1,
};

describe("supplierQuote", () => {
  it("multiplies the adult rate by nights and adults", () => {
    // June is low season: 200.00 x 2 adults x 5 nights = 2,000.00
    const quote = supplierQuote(resort, { checkIn: "2027-06-10", nights: 5, adults: 2, children: 0 });
    assert.equal(quote.nightly.length, 5);
    assert.equal(quote.roomUsdCents, 200_000);
    assert.equal(quote.taxUsdCents, 32_000); // 16%
    assert.equal(quote.levyUsdCents, 6_000); // 6.00 x 2 guests x 5 nights
    assert.equal(quote.totalUsdCents, 238_000);
  });

  it("charges a child the resort's percentage of the adult rate", () => {
    const adultsOnly = supplierQuote(resort, { checkIn: "2027-06-10", nights: 1, adults: 2, children: 0 });
    const withChild = supplierQuote(resort, { checkIn: "2027-06-10", nights: 1, adults: 2, children: 1 });
    assert.equal(withChild.roomUsdCents - adultsOnly.roomUsdCents, 10_000); // half of 200.00
    assert.equal(withChild.levyUsdCents - adultsOnly.levyUsdCents, 600); // the levy is per guest
  });

  it("prices each night by its own season", () => {
    assert.equal(seasonPercent("2027-01-15"), 125);
    assert.equal(seasonPercent("2027-04-15"), 110);
    assert.equal(seasonPercent("2027-08-15"), 100);
    // 30 Nov (shoulder, 110%) then 1 Dec (dry season, 125%), one adult
    const quote = supplierQuote(resort, { checkIn: "2027-11-30", nights: 2, adults: 1, children: 0 });
    assert.deepEqual(
      quote.nightly.map((night) => night.usdCents),
      [22_000, 25_000],
    );
  });

  it("scales linearly: twice the nights costs twice as much within one season", () => {
    const three = supplierQuote(resort, { checkIn: "2027-06-01", nights: 3, adults: 2, children: 1 });
    const six = supplierQuote(resort, { checkIn: "2027-06-01", nights: 6, adults: 2, children: 1 });
    assert.equal(six.totalUsdCents, three.totalUsdCents * 2);
  });
});

describe("buildQuote", () => {
  it("runs supplier total through margin, rate and rounding", () => {
    // 2,380.00 USD x 1.12 x 2.7150 = 7,237.104 GEL -> 7,237
    const quote = buildQuote(resort, { checkIn: "2027-06-10", nights: 5, adults: 2, children: 0 }, 1_200, SAMPLE_RATES);
    assert.equal(quote.price.supplierUsdCents, 238_000);
    assert.equal(quote.price.unroundedGel, "7237.1040");
    assert.equal(quote.price.totalTetri, 723_700);
  });

  it("uses the margin it is given", () => {
    const stay = { checkIn: "2027-06-10", nights: 5, adults: 2, children: 0 };
    const low = buildQuote(resort, stay, 500, SAMPLE_RATES);
    const high = buildQuote(resort, stay, 2_000, SAMPLE_RATES);
    assert.equal(low.price.totalTetri, 678_400); // 6,784.785
    assert.equal(high.price.totalTetri, 775_400); // 7,754.04
  });

  it("shows all three currencies from the same lari total", () => {
    const quote = buildQuote(resort, { checkIn: "2027-06-10", nights: 5, adults: 2, children: 0 }, 1_200, SAMPLE_RATES);
    assert.equal(displayAmounts(quote, "GEL").total, 723_700);
    assert.equal(displayAmounts(quote, "USD").total, 266_556); // 7,237 / 2.7150 = 2,665.5616
    assert.equal(displayAmounts(quote, "EUR").total, 245_488); // 7,237 / 2.9480 = 2,454.8846
    assert.equal(displayAmounts(quote, "GEL").perGuestNight, 72_400); // 7,237 / 10 = 723.7
  });

  it("produces a positive whole-lari price for every resort in the catalogue", () => {
    for (const each of RESORTS) {
      const quote = buildQuote(each, { checkIn: "2027-02-01", nights: 4, adults: 2, children: 1 }, 1_200, SAMPLE_RATES);
      assert.ok(quote.price.totalTetri > 0, each.id);
      assert.equal(quote.price.totalTetri % 100, 0, each.id);
    }
  });
});
