import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { StaffBar, StaffGate } from "@/components/StaffGate";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/pricing";
import { isDemoStaff, type SearchParams } from "@/lib/request";
import { listBookings, STATUS_LABEL, type BookingStatus } from "@/lib/store";

export const metadata: Metadata = { title: "Staff order book" };

const STATUSES = Object.keys(STATUS_LABEL) as BookingStatus[];

export default async function StaffPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!(await isDemoStaff())) return <StaffGate />;

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const status = typeof params.status === "string" && STATUSES.includes(params.status as BookingStatus) ? params.status : "";
  const all = listBookings();
  const bookings = listBookings({ q, status });

  return (
    <>
      <StaffBar />
      <div className="wrap staff-page">
        <h1>Order book</h1>

        <Form action="/staff" className="staff-filter" key={`${q}|${status}`}>
          <div className="field field-wide">
            <label htmlFor="staff-q">Search</label>
            <input id="staff-q" type="search" name="q" defaultValue={q} placeholder="Reference, guest, email or resort" />
          </div>
          <div className="field">
            <label htmlFor="staff-status">Status</label>
            <select id="staff-status" name="status" defaultValue={status}>
              <option value="">Any status</option>
              {STATUSES.map((each) => (
                <option key={each} value={each}>{STATUS_LABEL[each]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="button button-primary">Filter bookings</button>
          {(q || status) && <Link href="/staff" className="button button-quiet">Clear</Link>}
        </Form>

        <p className="results-meta" role="status">
          Showing {bookings.length} of {all.length} bookings
        </p>

        {bookings.length === 0 ? (
          <p className="notice">No booking matches. Try a shorter search or another status.</p>
        ) : (
          <table className="orders">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Guest</th>
                <th scope="col">Resort and dates</th>
                <th scope="col" className="num">Total</th>
                <th scope="col" className="num">Deposit</th>
                <th scope="col">Status</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.ref}>
                  <td data-label="Reference">
                    <Link href={`/staff/${booking.ref}`} className="ref-link">{booking.ref}</Link>
                  </td>
                  <td data-label="Guest">
                    {booking.guest.firstName} {booking.guest.lastName}
                    <span className="cell-sub">{booking.guest.email}</span>
                  </td>
                  <td data-label="Resort and dates">
                    {booking.resortName}
                    <span className="cell-sub">
                      {formatDate(booking.stay.checkIn)}, {booking.stay.nights} {booking.stay.nights === 1 ? "night" : "nights"}, {booking.stay.adults + booking.stay.children}{" "}
                      {booking.stay.adults + booking.stay.children === 1 ? "guest" : "guests"}
                    </span>
                  </td>
                  <td data-label="Total" className="num">{formatMoney(booking.price.totalTetri, "GEL")}</td>
                  <td data-label="Deposit" className="num">
                    {booking.depositTetri === null ? <span className="muted">Not set</span> : formatMoney(booking.depositTetri, "GEL")}
                  </td>
                  <td data-label="Status">
                    <span className={`status status-${booking.status}`}>{STATUS_LABEL[booking.status]}</span>
                  </td>
                  <td data-label="Received">{formatDateTime(booking.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
