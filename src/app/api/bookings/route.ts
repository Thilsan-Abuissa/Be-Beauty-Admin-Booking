import { BOOKING_COLUMNS, db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { BOOKING_WINDOW_DAYS, SERVICES, STYLISTS, TIME_SLOTS } from "@/lib/catalog";
import { addDays, isTooSoon, salonToday } from "@/lib/dates";
import { DATE_RE, isUniqueViolation, json, unauthorized } from "@/lib/http";

// Public: the booking page posts here.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);

  const service = String(body.service ?? "");
  const stylist = String(body.stylist || "No preference");
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  const catalogEntry = SERVICES[service];
  if (!catalogEntry) return json({ error: "Please choose a treatment." }, 400);
  if (!STYLISTS.includes(stylist)) return json({ error: "Unknown stylist." }, 400);
  if (!TIME_SLOTS.includes(time)) return json({ error: "Please choose a time." }, 400);

  const today = salonToday();
  if (!DATE_RE.test(date) || date < today || date > addDays(today, BOOKING_WINDOW_DAYS)) {
    return json({ error: "Please choose a valid date." }, 400);
  }
  if (isTooSoon(date, time)) {
    return json({ error: "That time has already passed for today. Please pick a later time or another day." }, 400);
  }
  if (name.length < 2 || name.length > 80) return json({ error: "Please enter your full name." }, 400);
  if (!/^\+?[\d\s-]{7,20}$/.test(phone)) return json({ error: "Please enter a valid mobile number." }, 400);

  try {
    const rows = await db()`
      INSERT INTO bookings
        (service, price, duration_min, stylist, booking_date, booking_time, customer_name, customer_phone)
      VALUES
        (${service}, ${catalogEntry.price}, ${catalogEntry.minutes}, ${stylist}, ${date}, ${time}, ${name}, ${phone})
      RETURNING id`;
    return json({ ok: true, id: (rows as { id: number }[])[0].id }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: `${stylist} is already booked at that time. Please pick another slot.` }, 409);
    }
    console.error("Create booking failed", err);
    return json({ error: "Could not save your booking. Please try again." }, 500);
  }
}

// Admin: bookings in a date range, used by the calendar.
export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const url = new URL(request.url);
  const start = (url.searchParams.get("start") ?? "").slice(0, 10);
  const end = (url.searchParams.get("end") ?? "").slice(0, 10);
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) return json({ error: "start and end are required" }, 400);

  const rows = await db().query(
    `SELECT ${BOOKING_COLUMNS} FROM bookings
     WHERE booking_date >= $1 AND booking_date < $2
     ORDER BY booking_date, booking_time`,
    [start, end],
  );
  return json({ bookings: rows });
}
