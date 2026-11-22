import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { convertFromGel, formatMoney } from "@/lib/pricing";
import { SAMPLE_RATES } from "@/lib/quote";
import { getCurrency } from "@/lib/request";
import { getBooking, STATUS_LABEL } from "@/lib/store";

export const metadata: Metadata = { title: "Booking request sent" };

const NEXT_STEP = {
  new: "Staff will check availability with the resort and email you the deposit amount, usually within one working day.",
  confirmed: "Your booking is confirmed. Pay the deposit below to hold the villa; the rest is due 30 days before arrival.",
  deposit_paid: "Your deposit has arrived and the villa is held for you.",
  cancelled: "This booking was cancelled. Nothing is owed.",
};

export default async function ConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const booking = getBooking((await params).ref);
  if (!booking) notFound();
  const currency = await getCurrency();
  const { stay, guest } = booking;

  return (
    <div className="wrap narrow confirmation">
      <ol className="steps" aria-label="Booking progress">
        {["Your stay", "Guest details", "Review", "Confirmation"].map((name, index) => (
          <li key={name} className={index === 3 ? "is-current" : "is-done"} aria-current={index === 3 ? "step" : undefined}>
            <span className="steps-number">{index + 1}</span>
            <span className="steps-name">{name}</span>
          </li>
        ))}
      </ol>

      <h1>{booking.status === "new" ? "Booking request sent" : STATUS_LABEL[booking.status]}</h1>
      <p className="reference">
        Your reference is <strong>{booking.ref}</strong>
      </p>
      <p className="lede">{NEXT_STEP[booking.status]}</p>

      <dl className="review">
        <div><dt>Status</dt><dd><span className={`status status-${booking.status}`}>{STATUS_LABEL[booking.status]}</span></dd></div>
        <div><dt>Resort</dt><dd>{booking.resortName}, {booking.villa.toLowerCase()}</dd></div>
        <div><dt>Dates</dt><dd>{formatDate(stay.checkIn)} to {formatDate(stay.checkOut)} ({stay.nights} {stay.nights === 1 ? "night" : "nights"})</dd></div>
        <div>
          <dt>Guests</dt>
          <dd>
            {stay.adults} {stay.adults === 1 ? "adult" : "adults"}
            {stay.children > 0 && `, ${stay.children} ${stay.children === 1 ? "child" : "children"}`}
          </dd>
        </div>
        <div><dt>Lead guest</dt><dd>{guest.firstName} {guest.lastName}, {guest.email}</dd></div>
        {booking.depositTetri !== null && (
          <div><dt>Deposit</dt><dd>{formatMoney(booking.depositTetri, "GEL")}</dd></div>
        )}
        <div className="review-total">
          <dt>Total, taxes included</dt>
          <dd>
            {formatMoney(booking.price.totalTetri, "GEL")}
            {currency !== "GEL" && (
              <span className="review-approx"> ({formatMoney(convertFromGel(booking.price.totalTetri, currency, SAMPLE_RATES), currency)})</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="price-note">
        The total was fixed in lari when you sent the request, at the rate of {(booking.price.gelPerUsdE4 / 10_000).toFixed(4)} lari
        to the dollar from {formatDate(booking.rateAsOf)}.
      </p>

      <div className="actions">
        <Link href="/" className="button button-quiet">Back to all resorts</Link>
        <Link href={`/staff/${booking.ref}`} className="button button-quiet">See this booking as staff (demo)</Link>
      </div>
    </div>
  );
}
