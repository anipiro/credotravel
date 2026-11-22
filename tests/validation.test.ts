import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, nightsBetween, parseIsoDate } from "../lib/dates.ts";
import { validateGuest, validateStay } from "../lib/validation.ts";

const today = "2026-11-22";

describe("dates", () => {
  it("counts nights across a month and a leap day", () => {
    assert.equal(nightsBetween("2027-01-29", "2027-02-03"), 5);
    assert.equal(nightsBetween("2028-02-28", "2028-03-01"), 2);
    assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  });

  it("rejects dates that do not exist", () => {
    assert.equal(parseIsoDate("2027-02-31"), null);
    assert.equal(parseIsoDate("12/01/2027"), null);
    assert.equal(parseIsoDate(undefined), null);
  });
});

describe("validateStay", () => {
  const good = { checkIn: "2027-01-10", checkOut: "2027-01-15", adults: "2", children: "1" };

  it("accepts a normal stay and counts the nights", () => {
    const result = validateStay(good, { today, maxGuests: 4 });
    assert.ok(result.ok);
    assert.deepEqual(result.value, { checkIn: "2027-01-10", checkOut: "2027-01-15", adults: 2, children: 1, nights: 5 });
  });

  it("refuses check-in today or in the past", () => {
    const result = validateStay({ ...good, checkIn: today, checkOut: "2026-11-25" }, { today });
    assert.ok(!result.ok);
    assert.ok(result.errors.checkIn);
  });

  it("refuses check-out on or before check-in, and stays over 21 nights", () => {
    const same = validateStay({ ...good, checkOut: "2027-01-10" }, { today });
    const long = validateStay({ ...good, checkOut: "2027-02-10" }, { today });
    assert.ok(!same.ok && same.errors.checkOut);
    assert.ok(!long.ok && long.errors.checkOut);
  });

  it("refuses zero adults, too many guests and non-numbers", () => {
    const none = validateStay({ ...good, adults: 0 }, { today });
    const crowd = validateStay({ ...good, adults: 4, children: 1 }, { today, maxGuests: 4 });
    const junk = validateStay({ ...good, adults: "two", children: -1 }, { today });
    assert.ok(!none.ok && none.errors.adults);
    assert.ok(!crowd.ok && crowd.errors.adults);
    assert.ok(!junk.ok && junk.errors.adults && junk.errors.children);
  });
});

describe("validateGuest", () => {
  const good = { firstName: "Nino", lastName: "Samplidze", email: "Nino@Example.com", phone: "+995 555 010 203", notes: "" };

  it("accepts good details and normalises the email", () => {
    const result = validateGuest(good);
    assert.ok(result.ok);
    assert.equal(result.value.email, "nino@example.com");
  });

  it("accepts names in Georgian script and with hyphens", () => {
    assert.ok(validateGuest({ ...good, firstName: "ნინო", lastName: "Anne-Marie" }).ok);
  });

  it("reports every missing required field", () => {
    const result = validateGuest({});
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["email", "firstName", "lastName", "phone"]);
  });

  it("refuses malformed emails", () => {
    for (const email of ["nino", "nino@", "nino@example", "ni no@example.com", "@example.com"]) {
      const result = validateGuest({ ...good, email });
      assert.ok(!result.ok && result.errors.email, email);
    }
  });

  it("refuses phone numbers that are too short, too long or contain letters", () => {
    for (const phone of ["12345", "+995 555 CALL ME", "1234567890123456"]) {
      const result = validateGuest({ ...good, phone });
      assert.ok(!result.ok && result.errors.phone, phone);
    }
  });

  it("refuses digits in names and notes over 500 characters", () => {
    const name = validateGuest({ ...good, firstName: "N1no" });
    const notes = validateGuest({ ...good, notes: "x".repeat(501) });
    assert.ok(!name.ok && name.errors.firstName);
    assert.ok(!notes.ok && notes.errors.notes);
  });
});
