# Be Beauty: booking site + admin calendar

- `/`: customer booking page (`public/booking.html`)
- `/admin`: password-protected calendar of all bookings

Stack: Next.js 16 · Neon Postgres (`@neondatabase/serverless`) · FullCalendar 6 · hosted on Vercel.

## Local setup

1. In Neon, create a project and copy the **pooled** connection string.
2. `cp .env.example .env.local` and fill in `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (`openssl rand -hex 32`).
3. `npm install`
4. `npm run db:setup`: creates the `bookings` table (safe to re-run).
5. `npm run dev` → http://localhost:3000 (booking page) and http://localhost:3000/admin

## Deploy to Vercel

1. Push this folder to GitHub and import it in Vercel.
2. Add the same three env vars under Project → Settings → Environment Variables.
3. Deploy. (You only run `npm run db:setup` once; it's the same Neon database.)

## Notes

- Prices/durations are set on the server in `src/lib/catalog.ts`. If you change a service in `booking.html`, change it there too.
- A named stylist can't be double-booked for the same slot (enforced by a DB unique index). Taken slots are greyed out on the booking page.
- The admin calendar refreshes every 60 seconds and when the tab regains focus.
- Optional env: `SALON_TIMEZONE` (default `Asia/Qatar`).
