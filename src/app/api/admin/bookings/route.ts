import { BOOKING_COLUMNS, db, STATUSES } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { SERVICES, STYLISTS } from "@/lib/catalog";
import { DATE_RE, isUniqueViolation, json, TIME_RE, unauthorized } from "@/lib/http";

// Admin: add a booking taken by phone or for a walk-in.
// Unlike the public form, any time of day is allowed, the phone number is optional,
// and the booking can be saved as already confirmed.
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);

  const service = String(body.service ?? "");
  const stylist = String(body.stylist || "No preference");
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const status = String(body.status || "confirmed");
  const notes = String(body.notes ?? "").trim().slice(0, 1000) || null;

  const catalogEntry = SERVICES[service];
  if (!catalogEntry) return json({ error: "Please choose a treatment." }, 400);
  if (!STYLISTS.includes(stylist)) return json({ error: "Unknown stylist." }, 400);
  if (!DATE_RE.test(date)) return json({ error: "Please choose a date." }, 400);
  if (!TIME_RE.test(time)) return json({ error: "Please choose a time." }, 400);
  if (name.length < 2 || name.length > 80) return json({ error: "Please enter the customer's name." }, 400);
  if (phone && !/^\+?[\d\s-]{7,20}$/.test(phone)) return json({ error: "That phone number doesn't look right." }, 400);
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return json({ error: "Invalid status" }, 400);

  try {
    const rows = await db().query(
      `INSERT INTO bookings
         (service, price, duration_min, stylist, booking_date, booking_time, customer_name, customer_phone, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${BOOKING_COLUMNS}`,
      [service, catalogEntry.price, catalogEntry.minutes, stylist, date, time, name, phone, status, notes],
    );
    return json({ booking: rows[0] }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: `${stylist} already has a booking at that time.` }, 409);
    }
    console.error("Admin create booking failed", err);
    return json({ error: "Could not save the booking. Please try again." }, 500);
  }
}
