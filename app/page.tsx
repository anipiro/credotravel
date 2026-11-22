import Form from "next/form";
import Link from "next/link";
import { AtollChart } from "@/components/AtollChart";
import { IslandArt } from "@/components/IslandArt";
import { StayFields } from "@/components/StayFields";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/pricing";
import { buildQuote, displayAmounts } from "@/lib/quote";
import { getCurrency, readStay, stayQuery, type SearchParams } from "@/lib/request";
import { ATOLLS, RESORTS, findAtoll } from "@/lib/supplier";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const currency = await getCurrency();
  const { fields, result, today } = readStay(params);
  const atollParam = typeof params.atoll === "string" ? params.atoll : "";
  const atoll = findAtoll(atollParam);
  const errors = result.ok ? {} : result.errors;
  const query = stayQuery(fields);

  const resorts = RESORTS.filter((resort) => !atoll || resort.atollId === atoll.id);
  const stay = result.ok ? result.value : null;
  const guests = stay ? stay.adults + stay.children : 0;

  const rows = resorts
    .map((resort) => {
      const fits = stay ? guests <= resort.maxGuests : false;
      const amounts = stay && fits ? displayAmounts(buildQuote(resort, stay), currency) : null;
      return { resort, fits, amounts };
    })
    .sort((a, b) => (a.amounts?.total ?? Infinity) - (b.amounts?.total ?? Infinity));

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>Find an island, see the whole price in lari.</h1>
            <p className="lede">
              Choose an atoll on the chart or in the list, set your dates, and every resort shows one total with taxes
              already in it.
            </p>

            <Form action="/" className="search" key={`${atollParam}|${query}`} scroll={false}>
              <div className="field field-wide">
                <label htmlFor="search-atoll">Destination</label>
                <select id="search-atoll" name="atoll" defaultValue={atoll?.id ?? ""}>
                  <option value="">All three atolls</option>
                  {ATOLLS.map((each) => (
                    <option key={each.id} value={each.id}>{each.name}</option>
                  ))}
                </select>
              </div>
              <StayFields fields={fields} errors={errors} today={today} idPrefix="search" />
              <button type="submit" className="button button-primary search-submit">Show resorts</button>
            </Form>
          </div>

          <div className="hero-chart">
            <AtollChart selected={atoll?.id ?? ""} query={query} />
          </div>
        </div>
      </section>

      <section className="wrap results" id="resorts" aria-labelledby="results-title">
        <div className="results-head">
          <h2 id="results-title">{atoll ? `Resorts in ${atoll.name}` : "Resorts in all three atolls"}</h2>
          {stay ? (
            <p className="results-meta">
              {formatDate(stay.checkIn)} to {formatDate(stay.checkOut)}, {stay.nights} {stay.nights === 1 ? "night" : "nights"},{" "}
              {stay.adults} {stay.adults === 1 ? "adult" : "adults"}
              {stay.children > 0 && ` and ${stay.children} ${stay.children === 1 ? "child" : "children"}`}
              . {atoll && <Link href={`/?${query}#resorts`} scroll={false}>Show all atolls</Link>}
            </p>
          ) : (
            <p className="results-meta notice-inline">Fix the dates or guests above to see prices.</p>
          )}
        </div>

        <ul className="resort-list">
          {rows.map(({ resort, fits, amounts }) => (
            <li key={resort.id} className="resort-row">
              <Link href={`/resorts/${resort.id}?${query}`} className="resort-art" tabIndex={-1} aria-hidden="true">
                <IslandArt seed={resort.seed} label="" />
              </Link>
              <div className="resort-info">
                <h3>
                  <Link href={`/resorts/${resort.id}?${query}`}>{resort.name}</Link>
                </h3>
                <p className="resort-place">{findAtoll(resort.atollId)?.name}, {resort.transfer.toLowerCase()}</p>
                <p className="resort-summary">{resort.villa}. {resort.highlights.join(", ")}.</p>
              </div>
              <div className="resort-price">
                {amounts ? (
                  <>
                    <p className="price-night">
                      <span className="price-from">from</span> <strong>{formatMoney(amounts.perGuestNight, currency)}</strong>
                    </p>
                    <p className="price-unit">per night, per guest</p>
                    <p className="price-total">{formatMoney(amounts.total, currency)} total, taxes included</p>
                  </>
                ) : stay && !fits ? (
                  <p className="price-unit">Sleeps up to {resort.maxGuests} guests. Reduce the party to see a price.</p>
                ) : (
                  <p className="price-unit">Set valid dates to see a price.</p>
                )}
                <Link href={`/resorts/${resort.id}?${query}`} className="button button-quiet">
                  View resort<span className="visually-hidden">: {resort.name}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
