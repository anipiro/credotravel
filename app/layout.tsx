import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import Link from "next/link";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { getCurrency } from "@/lib/request";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Atoll Booking Demo", template: "%s | Atoll Booking Demo" },
  description: "A portfolio demo of a resort booking flow priced in Georgian lari. All data is invented.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F5468" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currency = await getCurrency();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="wrap site-header-inner">
            <Link href="/" className="wordmark">
              <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
                <circle cx="14" cy="14" r="13" fill="#0F5468" />
                <ellipse cx="14" cy="14" rx="8.5" ry="6" fill="none" stroke="#7FD9CC" strokeWidth="3" strokeDasharray="5 2.4" />
                <circle cx="14" cy="14" r="1.8" fill="#FFB42E" />
              </svg>
              <span>Atoll Booking Demo</span>
            </Link>
            <nav className="site-nav" aria-label="Main">
              <CurrencySwitch current={currency} />
              <Link href="/staff" className="nav-link">Staff</Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p className="demo-label">Portfolio demo — not the real Credo Travel site</p>
            <p>
              Every resort, atoll, price and exchange rate here is invented. Nothing is charged, no email is sent, and
              bookings are kept in memory until the server restarts.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
