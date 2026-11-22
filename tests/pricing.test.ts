import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convertFromGel,
  formatMoney,
  parseGelInput,
  perGuestNight,
  priceInGel,
  suggestedDepositTetri,
  type RateTable,
} from "../lib/pricing.ts";

const rates: RateTable = { asOf: "2026-11-02", gelPerUnitE4: { USD: 27_150, EUR: 29_480 } };

describe("priceInGel", () => {
  it("adds the margin, converts and rounds down to a whole lari", () => {
    // 1,000.00 USD + 12% = 1,120.00 USD; x 2.7150 = 3,040.80 GEL -> 3,040
    const price = priceInGel({ supplierUsdCents: 100_000, marginBps: 1_200, gelPerUsdE4: 27_150 });
    assert.equal(price.totalTetri, 304_000);
    assert.equal(price.unroundedGel, "3040.8000");
    assert.equal(price.withMarginUsd, "1120.0000");
    assert.equal(price.roundedOffTetri, 80);
  });

  it("rounds down even when the fraction is .99", () => {
    // 368.32 USD x 1.00 x 2.7150 = 999.9888 GEL -> 999, not 1,000
    const price = priceInGel({ supplierUsdCents: 36_832, marginBps: 0, gelPerUsdE4: 27_150 });
    assert.equal(price.unroundedGel, "999.9888");
    assert.equal(price.totalTetri, 99_900);
  });

  it("keeps an exact whole-lari figure unchanged", () => {
    // 2,000.00 USD x 1.10 x 2.5000 = 5,500 GEL exactly
    const price = priceInGel({ supplierUsdCents: 200_000, marginBps: 1_000, gelPerUsdE4: 25_000 });
    assert.equal(price.totalTetri, 550_000);
    assert.equal(price.roundedOffTetri, 0);
  });

  it("applies the margin as a percentage of the supplier price", () => {
    const none = priceInGel({ supplierUsdCents: 100_000, marginBps: 0, gelPerUsdE4: 10_000 });
    const tenth = priceInGel({ supplierUsdCents: 100_000, marginBps: 1_000, gelPerUsdE4: 10_000 });
    const quarter = priceInGel({ supplierUsdCents: 100_000, marginBps: 2_500, gelPerUsdE4: 10_000 });
    assert.equal(none.totalTetri, 100_000);
    assert.equal(tenth.totalTetri, 110_000);
    assert.equal(quarter.totalTetri, 125_000);
  });

  it("rounds once, at the end, not after the margin step", () => {
    // 0.33 USD + 12.5% = 0.37125 USD. Rounding that to 0.37 first and then
    // converting at 300 would give 111.00 GEL; carried exactly it is 111.375.
    const price = priceInGel({ supplierUsdCents: 33, marginBps: 1_250, gelPerUsdE4: 3_000_000 });
    assert.equal(price.unroundedGel, "111.3750");
    assert.equal(price.totalTetri, 11_100);
  });

  it("never exceeds the unrounded figure and gives up less than one lari", () => {
    let seed = 12345;
    const next = (max: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed % max;
    };
    for (let i = 0; i < 2_000; i++) {
      const supplierUsdCents = next(5_000_000);
      const marginBps = next(4_001);
      const gelPerUsdE4 = 20_000 + next(15_000);
      const price = priceInGel({ supplierUsdCents, marginBps, gelPerUsdE4 });
      // Compare as exact integers: tetri x 10^8 against the exact numerator.
      const exact = BigInt(supplierUsdCents) * BigInt(10_000 + marginBps) * BigInt(gelPerUsdE4);
      const charged = BigInt(price.totalTetri) * 100_000_000n;
      assert.ok(charged <= exact, "charged more than the exact figure");
      assert.ok(exact - charged < 100n * 100_000_000n, "gave up a lari or more");
      assert.equal(price.totalTetri % 100, 0);
      assert.ok(price.roundedOffTetri >= 0 && price.roundedOffTetri < 100);
    }
  });

  it("stays exact for large amounts", () => {
    // 9,999,999.99 USD x 1.3333 x 3.4999 = 46,664,166.65... GEL
    const price = priceInGel({ supplierUsdCents: 999_999_999, marginBps: 3_333, gelPerUsdE4: 34_999 });
    assert.equal(price.totalTetri, 4_666_416_600);
    assert.equal(price.unroundedGel.slice(0, 11), "46664166.65");
  });

  it("prices a zero quote at zero", () => {
    assert.equal(priceInGel({ supplierUsdCents: 0, marginBps: 1_200, gelPerUsdE4: 27_150 }).totalTetri, 0);
  });

  it("rejects fractional cents, negative amounts and a zero rate", () => {
    assert.throws(() => priceInGel({ supplierUsdCents: 10.5, marginBps: 0, gelPerUsdE4: 27_150 }), RangeError);
    assert.throws(() => priceInGel({ supplierUsdCents: -1, marginBps: 0, gelPerUsdE4: 27_150 }), RangeError);
    assert.throws(() => priceInGel({ supplierUsdCents: 100, marginBps: -5, gelPerUsdE4: 27_150 }), RangeError);
    assert.throws(() => priceInGel({ supplierUsdCents: 100, marginBps: 0, gelPerUsdE4: 0 }), RangeError);
    assert.throws(() => priceInGel({ supplierUsdCents: Number.NaN, marginBps: 0, gelPerUsdE4: 27_150 }), RangeError);
  });
});

describe("convertFromGel", () => {
  it("returns the lari amount untouched for GEL", () => {
    assert.equal(convertFromGel(304_000, "GEL", rates), 304_000);
  });

  it("derives dollars and euros from the lari total, rounded down to the cent", () => {
    // 3,040 GEL / 2.7150 = 1,119.7053... USD; / 2.9480 = 1,031.2075... EUR
    assert.equal(convertFromGel(304_000, "USD", rates), 111_970);
    assert.equal(convertFromGel(304_000, "EUR", rates), 103_120);
  });

  it("never shows a foreign figure worth more than the lari charged", () => {
    for (let lari = 1; lari <= 60_000; lari += 37) {
      const tetri = lari * 100;
      for (const currency of ["USD", "EUR"] as const) {
        const minor = convertFromGel(tetri, currency, rates);
        const rate = rates.gelPerUnitE4[currency];
        // minor x rate / 10^4 is the displayed figure's worth in tetri.
        assert.ok(minor * rate <= tetri * 10_000);
        assert.ok((minor + 1) * rate > tetri * 10_000, "more than a cent below");
      }
    }
  });

  it("keeps the three currencies in the same order for any two prices", () => {
    const cheaper = 812_300;
    const dearer = 812_400;
    for (const currency of ["GEL", "USD", "EUR"] as const) {
      assert.ok(convertFromGel(cheaper, currency, rates) < convertFromGel(dearer, currency, rates));
    }
  });

  it("shows a dollar figure at or below supplier price plus margin", () => {
    const price = priceInGel({ supplierUsdCents: 459_668, marginBps: 1_200, gelPerUsdE4: rates.gelPerUnitE4.USD });
    const usd = convertFromGel(price.totalTetri, "USD", rates);
    assert.ok(usd <= Math.floor(459_668 * 1.12));
  });
});

describe("perGuestNight", () => {
  it("divides the total by nights x guests", () => {
    // 12,000 GEL over 5 nights and 3 guests = 800 per guest per night
    assert.equal(perGuestNight(1_200_000, 5, 3), 80_000);
  });

  it("rounds the guide figure to the nearest whole unit", () => {
    assert.equal(perGuestNight(100_000, 3, 1), 33_300); // 333.33
    assert.equal(perGuestNight(200_000, 3, 1), 66_700); // 666.67
    assert.equal(perGuestNight(100_100, 2, 1), 50_100); // 500.50 rounds up
  });

  it("refuses zero nights or zero guests", () => {
    assert.throws(() => perGuestNight(100_000, 0, 2), RangeError);
    assert.throws(() => perGuestNight(100_000, 2, 0), RangeError);
  });
});

describe("suggestedDepositTetri", () => {
  it("is 30% of the total rounded down to a whole lari", () => {
    assert.equal(suggestedDepositTetri(304_000), 91_200);
    assert.equal(suggestedDepositTetri(99_900), 29_900); // 299.70 -> 299
  });

  it("never exceeds the total", () => {
    assert.equal(suggestedDepositTetri(304_000, 100), 304_000);
  });
});

describe("formatMoney", () => {
  it("puts the lari sign after the number", () => {
    assert.equal(formatMoney(1_248_000, "GEL"), "12,480 ₾");
    assert.equal(formatMoney(90_000, "GEL"), "900 ₾");
  });

  it("puts dollar and euro signs before the number and keeps cents", () => {
    assert.equal(formatMoney(459_668, "USD"), "$4,596.68");
    assert.equal(formatMoney(423_305, "EUR"), "€4,233.05");
  });

  it("drops zero decimals and groups millions", () => {
    assert.equal(formatMoney(123_456_700, "USD"), "$1,234,567");
    assert.equal(formatMoney(0, "GEL"), "0 ₾");
  });
});

describe("parseGelInput", () => {
  it("reads whole lari and tetri", () => {
    assert.equal(parseGelInput("1500"), 150_000);
    assert.equal(parseGelInput(" 1,500.5 "), 150_050);
    assert.equal(parseGelInput("0.07"), 7);
  });

  it("returns null for anything that is not an amount", () => {
    for (const bad of ["", "abc", "-5", "12.345", "1e3", "12."]) {
      assert.equal(parseGelInput(bad), null, bad);
    }
  });
});
