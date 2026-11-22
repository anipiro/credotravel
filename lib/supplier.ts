/**
 * A mocked supplier. It owns the resort list and quotes stays in US dollars,
 * the way a wholesale feed would. Every resort, atoll and rate is invented.
 */
import { addDays } from "./dates.ts";

export interface Atoll {
  id: string;
  name: string;
  note: string;
}

export interface Resort {
  id: string;
  name: string;
  atollId: string;
  villa: string;
  summary: string;
  transfer: string;
  highlights: string[];
  maxGuests: number;
  /** Low-season rate for one adult for one night, in USD cents, before taxes. */
  adultNightUsdCents: number;
  /** A child is charged this percentage of the adult rate. */
  childPercent: number;
  /** Seed for the island drawing. */
  seed: number;
}

export const ATOLLS: Atoll[] = [
  { id: "sunaru", name: "Sunaru Atoll", note: "Closest to the airport, calm lagoons" },
  { id: "kelavaru", name: "Kelavaru Atoll", note: "Long sandbanks, manta channel" },
  { id: "mirihandu", name: "Mirihandu Atoll", note: "Far south, the quietest reefs" },
];

export const RESORTS: Resort[] = [
  {
    id: "lumefaru-lagoon-villas",
    name: "Lumefaru Lagoon Villas",
    atollId: "sunaru",
    villa: "Lagoon villa with deck",
    summary:
      "Forty villas on stilts over a shallow lagoon you can wade across at low tide. Good for a first trip: short transfer, gentle water, a house reef ten minutes by kayak.",
    transfer: "25 minutes by speedboat",
    highlights: ["Half board", "Kayaks and snorkel gear", "Wade-in lagoon"],
    maxGuests: 4,
    adultNightUsdCents: 21_500,
    childPercent: 50,
    seed: 11,
  },
  {
    id: "tidewake-sandbank-lodge",
    name: "Tidewake Sandbank Lodge",
    atollId: "sunaru",
    villa: "Beach bungalow",
    summary:
      "A small lodge on a long spit of sand. Bungalows open straight onto the beach and the kitchen cooks whatever the dhoni brought in that morning.",
    transfer: "40 minutes by speedboat",
    highlights: ["Breakfast included", "Sandbank picnics", "Twelve bungalows"],
    maxGuests: 3,
    adultNightUsdCents: 14_800,
    childPercent: 40,
    seed: 27,
  },
  {
    id: "hinavelu-reef-house",
    name: "Hinavelu Reef House",
    atollId: "kelavaru",
    villa: "Reef-edge suite",
    summary:
      "Built for people who came to be underwater. The drop-off starts at the end of the jetty, and the dive boat leaves twice a day for the manta channel.",
    transfer: "35 minutes by seaplane",
    highlights: ["Full board", "Dive centre on the jetty", "Manta channel trips"],
    maxGuests: 4,
    adultNightUsdCents: 28_900,
    childPercent: 50,
    seed: 42,
  },
  {
    id: "noonglass-water-villas",
    name: "Noonglass Water Villas",
    atollId: "kelavaru",
    villa: "Overwater villa with pool",
    summary:
      "The grand one. Each villa has its own pool and a glass panel in the floor, and a butler who remembers how you take your coffee.",
    transfer: "35 minutes by seaplane",
    highlights: ["All inclusive", "Private pool", "Spa over the water"],
    maxGuests: 5,
    adultNightUsdCents: 46_200,
    childPercent: 60,
    seed: 58,
  },
  {
    id: "saffron-shoal-retreat",
    name: "Saffron Shoal Retreat",
    atollId: "mirihandu",
    villa: "Garden villa",
    summary:
      "Low thatched villas under old banyan trees, a long way from anywhere. Evenings are quiet enough to hear the reef.",
    transfer: "Domestic flight, then 15 minutes by boat",
    highlights: ["Half board", "Yoga at sunrise", "Turtle nesting beach"],
    maxGuests: 4,
    adultNightUsdCents: 18_300,
    childPercent: 50,
    seed: 73,
  },
  {
    id: "driftlantern-island",
    name: "Driftlantern Island",
    atollId: "mirihandu",
    villa: "Two-bedroom family house",
    summary:
      "A whole small island set up for families: shallow swimming on the west side, a kids' boat school, and houses with two bedrooms and a shaded yard.",
    transfer: "Domestic flight, then 30 minutes by boat",
    highlights: ["Full board", "Kids' boat school", "Two bedrooms"],
    maxGuests: 6,
    adultNightUsdCents: 24_600,
    childPercent: 35,
    seed: 96,
  },
];

export function findResort(id: string): Resort | undefined {
  return RESORTS.find((resort) => resort.id === id);
}

export function findAtoll(id: string): Atoll | undefined {
  return ATOLLS.find((atoll) => atoll.id === id);
}

/** Service charge and tax the supplier adds to the room rate: 16%. */
export const SUPPLIER_TAX_BPS = 1_600;
/** Environment levy per guest per night: 6.00 USD. */
export const LEVY_PER_GUEST_NIGHT_USD_CENTS = 600;

/** Season multiplier in percent, by month of the night being sold. */
export function seasonPercent(isoDate: string): number {
  const month = Number(isoDate.slice(5, 7));
  if (month === 12 || month <= 3) return 125; // dry season
  if (month === 4 || month === 11) return 110; // shoulder
  return 100;
}

export interface SupplierQuote {
  resortId: string;
  checkIn: string;
  nights: number;
  adults: number;
  children: number;
  /** Room charge for all guests, one entry per night, in USD cents. */
  nightly: { date: string; usdCents: number }[];
  roomUsdCents: number;
  taxUsdCents: number;
  levyUsdCents: number;
  /** What the agency pays the supplier, taxes included. */
  totalUsdCents: number;
}

export function supplierQuote(
  resort: Resort,
  stay: { checkIn: string; nights: number; adults: number; children: number },
): SupplierQuote {
  const { checkIn, nights, adults, children } = stay;
  const nightly: SupplierQuote["nightly"] = [];
  // Adults count 100 each, children their percentage, so one multiplication
  // prices the whole party and a single rounding happens per night.
  const partyWeight = adults * 100 + children * resort.childPercent;

  for (let i = 0; i < nights; i++) {
    const date = addDays(checkIn, i);
    const usdCents = Math.round((resort.adultNightUsdCents * seasonPercent(date) * partyWeight) / 10_000);
    nightly.push({ date, usdCents });
  }

  const roomUsdCents = nightly.reduce((sum, night) => sum + night.usdCents, 0);
  const taxUsdCents = Math.round((roomUsdCents * SUPPLIER_TAX_BPS) / 10_000);
  const levyUsdCents = LEVY_PER_GUEST_NIGHT_USD_CENTS * (adults + children) * nights;

  return {
    resortId: resort.id,
    checkIn,
    nights,
    adults,
    children,
    nightly,
    roomUsdCents,
    taxUsdCents,
    levyUsdCents,
    totalUsdCents: roomUsdCents + taxUsdCents + levyUsdCents,
  };
}
