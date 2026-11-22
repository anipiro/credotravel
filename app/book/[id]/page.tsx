import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/pricing";
import { buildQuote, displayAmounts } from "@/lib/quote";
import { getCurrency, readStay, stayQuery, type SearchParams } from "@/lib/request";
import { findAtoll, findResort } from "@/lib/supplier";

export const metadata: Metadata = { title: "Book your stay" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export default async function BookPage({ params, searchParams }: Props) {
  const resort = findResort((await params).id);
  if (!resort) notFound();

  const currency = await getCurrency();
  const { fields, result } = readStay(await searchParams, resort.maxGuests);
  const query = stayQuery(fields);

  if (!result.ok) {
    return (
      <div className="wrap narrow">
        <h1>These dates cannot be booked</h1>
        <ul className="error-list">
          {Object.values(result.errors).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
        <Link href={`/resorts/${resort.id}?${query}`} className="button button-primary">Change dates or guests</Link>
      </div>
    );
  }

  const stay = result.value;
  const quote = buildQuote(resort, stay);
  const amounts = displayAmounts(quote, currency);

  return (
    <div className="wrap booking-page">
      <BookingFlow
        resortId={resort.id}
        backHref={`/resorts/${resort.id}?${query}`}
        stay={stay}
        totalGelTetri={quote.price.totalTetri}
        summary={{
          resortName: resort.name,
          atollName: findAtoll(resort.atollId)?.name ?? "",
          villa: resort.villa,
          transfer: resort.transfer,
          dates: `${formatDate(stay.checkIn)} to ${formatDate(stay.checkOut)}`,
          nights: stay.nights,
          party:
            `${stay.adults} ${stay.adults === 1 ? "adult" : "adults"}` +
            (stay.children > 0 ? `, ${stay.children} ${stay.children === 1 ? "child" : "children"}` : ""),
          total: formatMoney(amounts.total, currency),
          totalGel: formatMoney(quote.price.totalTetri, "GEL"),
          perGuestNight: formatMoney(amounts.perGuestNight, currency),
          showsGel: currency === "GEL",
        }}
      />
    </div>
  );
}
