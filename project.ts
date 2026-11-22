// A typed summary of the project. The site's own source code is private.

type Locale = "ka" | "en" | "ru";
type Currency = "GEL" | "USD" | "EUR";

interface Project {
  name: string;
  client: string;
  liveSite: string;
  locales: Locale[];
  currencies: Currency[];
  stack: string[];
  features: string[];
}

export const project: Project = {
  name: "Credo Travel",
  client: "Credo Travel, a Georgian agency selling trips to the Maldives",
  liveSite: "https://www.credomaldive.com/en",
  locales: ["ka", "en", "ru"],
  currencies: ["GEL", "USD", "EUR"],
  stack: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Supabase", "Vercel"],
  features: [
    "Resort search by destination, dates and guests",
    "Live prices from the supplier, converted from dollars to lari at quote time",
    "Booking without an account, confirmed by staff",
    "Staff panel with an order book, audit trail and markup calculator",
  ],
};
