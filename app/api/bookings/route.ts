import { NextResponse } from "next/server";
import { todayIso } from "@/lib/dates";
import { formatMoney } from "@/lib/pricing";
import { buildQuote } from "@/lib/quote";
import { createBooking } from "@/lib/store";
import { findResort } from "@/lib/supplier";
import { validateGuest, validateStay } from "@/lib/validation";

/**
 * Creates a booking request. The body carries the stay and the guest, never
 * a price that is used: the total is recomputed here from a fresh supplier quote.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send the booking as a JSON object." }, { status: 400 });
  }

  const resort = typeof body.resortId === "string" ? findResort(body.resortId) : undefined;
  if (!resort) return NextResponse.json({ error: "This resort does not exist." }, { status: 404 });

  const stay = validateStay(
    { checkIn: body.checkIn, checkOut: body.checkOut, adults: body.adults, children: body.children },
    { today: todayIso(), maxGuests: resort.maxGuests },
  );
  const guestInput = typeof body.guest === "object" && body.guest !== null ? (body.guest as Record<string, unknown>) : {};
  const guest = validateGuest(guestInput);

  if (!stay.ok || !guest.ok) {
    return NextResponse.json(
      {
        error: "Some details are missing or not valid.",
        errors: { ...(stay.ok ? {} : { stay: stay.errors }), ...(guest.ok ? {} : { guest: guest.errors }) },
      },
      { status: 422 },
    );
  }

  const quote = buildQuote(resort, stay.value);

  // If the browser tells us what total it showed and that is no longer the
  // price, stop and say so rather than book at a figure the customer has not seen.
  if (body.seenTotalGelTetri !== undefined && body.seenTotalGelTetri !== quote.price.totalTetri) {
    return NextResponse.json(
      {
        error: `The price for this stay is now ${formatMoney(quote.price.totalTetri, "GEL")}.`,
        totalGelTetri: quote.price.totalTetri,
      },
      { status: 409 },
    );
  }

  const booking = createBooking({ resort, stay: stay.value, guest: guest.value, price: quote.price, rateAsOf: quote.rates.asOf });
  return NextResponse.json(
    { ref: booking.ref, status: booking.status, totalGelTetri: booking.price.totalTetri, total: formatMoney(booking.price.totalTetri, "GEL") },
    { status: 201 },
  );
}
