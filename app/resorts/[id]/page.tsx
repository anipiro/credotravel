import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IslandArt } from "@/components/IslandArt";
import { StayFields } from "@/components/StayFields";
import { formatMoney } from "@/lib/pricing";
import { buildQuote, displayAmounts } from "@/lib/quote";
import { getCurrency, readStay, stayQuery, type SearchParams } from "@/lib/request";
import { findAtoll, findResort } from "@/lib/supplier";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resort = findResort((await params).id);
  return { title: resort?.name ?? "Resort not found" };
}

export default async function ResortPage({ params, searchParams }: Props) {
  const resort = findResort((await params).id);
  if (!resort) notFound();

  const currency = await getCurrency();
  const { fields, result, today } = readStay(await searchParams, resort.maxGuests);
  const query = stayQuery(fields);
  const atoll = findAtoll(resort.atollId);
  const quote = result.ok ? buildQuote(resort, result.value) : null;
  const amounts = quote ? displayAmounts(quote, currency) : null;
  const stay = result.ok ? result.value : null;

  return (
    <div className="wrap resort-page">
      <p className="back">
        <Link href={`/?atoll=${resort.atollId}&${query}#resorts`}>Back to resorts in {atoll?.name}</Link>
      </p>

      <div className="resort-layout">
        <article className="resort-main">
          <h1>{resort.name}</h1>
          <p className="resort-place">{atoll?.name}, {resort.transfer.toLowerCase()}</p>
          <div className="resort-figure">
            <IslandArt seed={resort.seed} label={`Chart drawing of ${resort.name} from above`} />
          </div>
          <p className="resort-lede">{resort.summary}</p>

          <dl className="facts">
            <div>
              <dt>Villa</dt>
              <dd>{resort.villa}, sleeps up to {resort.maxGuests}</dd>
            </div>
            <div>
              <dt>Getting there</dt>
              <dd>{resort.transfer} from the main airport</dd>
            </div>
            <div>
              <dt>Included</dt>
              <dd>{resort.highlights.join(", ")}</dd>
            </div>
            <div>
              <dt>Children</dt>
              <dd>Ages 2 to 11 pay {resort.childPercent}% of the adult rate</dd>
            </div>
          </dl>
        </article>

        <aside className="price-panel" aria-labelledby="price-title">
          <h2 id="price-title">Your stay</h2>
          <Form action={`/resorts/${resort.id}`} className="stay-form" key={query} scroll={false}>
            <StayFields fields={fields} errors={result.ok ? {} : result.errors} today={today} idPrefix="stay" />
            <button type="submit" className="button button-quiet stay-update">Update price</button>
          </Form>

          {quote && amounts && stay ? (
            <div className="price-box" aria-live="polite">
              <p className="price-night price-night-large">
                <strong>{formatMoney(amounts.perGuestNight, currency)}</strong>
              </p>
              <p className="price-unit">per night, per guest, averaged over the stay</p>

              <dl className="price-lines">
                <div>
                  <dt>Stay</dt>
                  <dd>
                    {stay.nights} {stay.nights === 1 ? "night" : "nights"}, {quote.guests} {quote.guests === 1 ? "guest" : "guests"}
                  </dd>
                </div>
                <div className="price-lines-total">
                  <dt>Total, taxes included</dt>
                  <dd>{formatMoney(amounts.total, currency)}</dd>
                </div>
              </dl>

              {currency !== "GEL" && (
                <p className="price-note">
                  You pay {formatMoney(quote.price.totalTetri, "GEL")}. The figure above is that amount converted at the
                  sample rate of {(quote.rates.gelPerUnitE4[currency] / 10_000).toFixed(4)} lari, rounded down.
                </p>
              )}
              {currency === "GEL" && (
                <p className="price-note">Charged in lari at the rate fixed when you book. No fees are added later.</p>
              )}

              <Link href={`/book/${resort.id}?${query}`} className="button button-primary button-block">
                Start booking
              </Link>
              <p className="price-reassure">No account needed. Nothing is paid until staff confirm.</p>
            </div>
          ) : (
            <p className="notice" role="status">Correct the highlighted fields to see the price for this stay.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
