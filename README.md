# Credo Travel

Booking website for Credo Travel, a Georgian agency selling trips to the Maldives.

**Live site:** https://www.credomaldive.com/en

![Home page](screenshots/home-desktop.png)

I built this site at [AllOne](https://github.com/allonelabs). The source code belongs to the client and stays private, so this repository describes the project instead.

## What it does

- **Resort search.** Visitors pick a destination, dates and guests, and browse resorts with photos, location and prices.
- **Live prices.** Availability and prices come from the supplier's feed, are converted from US dollars to Georgian lari at quote time, and can be shown in lari, dollars or euros.
- **Booking without an account.** A customer books a stay in a few steps; staff confirm it and set the deposit.
- **Three languages.** Georgian, English and Russian, each on its own address (`/ka`, `/en`, `/ru`). A missing translation fails the build instead of showing an empty card.
- **Staff panel.** An order book with search and filters, a detail page per booking with its audit trail, a markup calculator, and staff roles.

![Resort page](screenshots/resort-desktop.png)

## How it is built

| Part | Technology |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Plain CSS |
| Data and sign-in | Supabase (Postgres with row-level security) |
| Hosting | Vercel |

## Things I had to get right

- Prices from the supplier arrive in dollars. Converting, adding the agency's margin and rounding without overcharging took several passes.
- Database views were running with their owner's rights, which bypassed row-level security. I found and fixed that, along with a path that let a customer confirm their own booking.
- The site only shows resorts and figures that exist in the supplier's data; every invented placeholder was removed.
