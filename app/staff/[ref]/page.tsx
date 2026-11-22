import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffActions } from "@/components/StaffActions";
import { StaffBar, StaffGate } from "@/components/StaffGate";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney, suggestedDepositTetri } from "@/lib/pricing";
import { isDemoStaff } from "@/lib/request";
import { getBooking, STATUS_LABEL } from "@/lib/store";

export const metadata: Metadata = { title: "Booking detail" };

export default async function StaffBookingPage({ params }: { params: Promise<{ ref: string }> }) {
  if (!(await isDemoStaff())) return <StaffGate />;
  const booking = getBooking((await params).ref);
  if (!booking) notFound();

  const { stay, guest, price } = booking;
  const suggested = suggestedDepositTetri(price.totalTetri);

  return (
    <>
      <StaffBar />
      <div className="wrap staff-page">
        <p className="back"><Link href="/staff">Back to the order book</Link></p>
        <div className="detail-head">
          <h1>Booking {booking.ref}</h1>
          <span className={`status status-${booking.status}`}>{STATUS_LABEL[booking.status]}</span>
        </div>

        <div className="detail-layout">
          <div>
            <section aria-labelledby="detail-stay">
              <h2 id="detail-stay">Stay and guest</h2>
              <dl className="review">
                <div><dt>Resort</dt><dd>{booking.resortName}, {booking.villa.toLowerCase()}</dd></div>
                <div><dt>Dates</dt><dd>{formatDate(stay.checkIn)} to {formatDate(stay.checkOut)} ({stay.nights} {stay.nights === 1 ? "night" : "nights"})</dd></div>
                <div><dt>Guests</dt><dd>{stay.adults} {stay.adults === 1 ? "adult" : "adults"}, {stay.children} {stay.children === 1 ? "child" : "children"}</dd></div>
                <div><dt>Lead guest</dt><dd>{guest.firstName} {guest.lastName}</dd></div>
                <div><dt>Email</dt><dd>{guest.email}</dd></div>
                <div><dt>Phone</dt><dd>{guest.phone}</dd></div>
                {guest.notes && <div><dt>Note</dt><dd>{guest.notes}</dd></div>}
                <div><dt>Received</dt><dd>{formatDateTime(booking.createdAt)}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="detail-price">
              <h2 id="detail-price">How the price was built</h2>
              <table className="buildup">
                <tbody>
                  <tr>
                    <th scope="row">Supplier quote, taxes included</th>
                    <td className="num">{formatMoney(price.supplierUsdCents, "USD")}</td>
                  </tr>
                  <tr>
                    <th scope="row">Agency margin, {(price.marginBps / 100).toFixed(price.marginBps % 100 === 0 ? 0 : 2)}%</th>
                    <td className="num">${Number(price.withMarginUsd).toLocaleString("en-US", { minimumFractionDigits: 4 })}</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      Converted at {(price.gelPerUsdE4 / 10_000).toFixed(4)} lari, rate of {formatDate(booking.rateAsOf)}
                    </th>
                    <td className="num">{Number(price.unroundedGel).toLocaleString("en-US", { minimumFractionDigits: 4 })}&nbsp;₾</td>
                  </tr>
                  <tr>
                    <th scope="row">Rounded down to a whole lari</th>
                    <td className="num">−{formatMoney(price.roundedOffTetri, "GEL")}</td>
                  </tr>
                  <tr className="buildup-total">
                    <th scope="row">Customer pays</th>
                    <td className="num">{formatMoney(price.totalTetri, "GEL")}</td>
                  </tr>
                </tbody>
              </table>
              <p className="price-note">
                The margin and the conversion are carried exactly and rounded once, downwards, so the customer never pays
                more than the unrounded figure.
              </p>
            </section>
          </div>

          <div>
            <section aria-labelledby="detail-actions" className="action-panel">
              <h2 id="detail-actions">Next step</h2>
              <StaffActions
                bookingRef={booking.ref}
                status={booking.status}
                total={formatMoney(price.totalTetri, "GEL")}
                deposit={booking.depositTetri === null ? null : formatMoney(booking.depositTetri, "GEL")}
                suggestedDepositGel={String(suggested / 100)}
              />
            </section>

            <section aria-labelledby="detail-audit">
              <h2 id="detail-audit">Audit trail</h2>
              <ol className="audit">
                {[...booking.audit].reverse().map((entry, index) => (
                  <li key={index}>
                    <p className="audit-change">
                      {entry.from ? `${STATUS_LABEL[entry.from]} to ${STATUS_LABEL[entry.to]}` : STATUS_LABEL[entry.to]}
                    </p>
                    <p className="audit-note">{entry.note}</p>
                    <p className="audit-meta">
                      {entry.actor}, <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
