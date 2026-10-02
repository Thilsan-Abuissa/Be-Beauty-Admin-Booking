import { BOOKING_COLUMNS, db, STATUSES } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { STYLISTS } from "@/lib/catalog";
import { DATE_RE, isUniqueViolation, json, TIME_RE, unauthorized } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

async function bookingId(context: Context) {
  const id = Number((await context.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Admin: change status, reschedule, reassign stylist or add notes.
export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return unauthorized();
  const id = await bookingId(context);
  if (!id) return json({ error: "Invalid id" }, 400);

  const body = await request.json().catch(() => ({}));
  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return json({ error: "Invalid status" }, 400);
    set("status", body.status);
  }
  if (body.booking_date !== undefined) {
    if (!DATE_RE.test(body.booking_date)) return json({ error: "Invalid date" }, 400);
    set("booking_date", body.booking_date);
  }
  if (body.booking_time !== undefined) {
    if (!TIME_RE.test(body.booking_time)) return json({ error: "Invalid time" }, 400);
    set("booking_time", body.booking_time);
  }
  if (body.stylist !== undefined) {
    if (!STYLISTS.includes(body.stylist)) return json({ error: "Invalid stylist" }, 400);
    set("stylist", body.stylist);
  }
  if (body.notes !== undefined) set("notes", String(body.notes).slice(0, 1000) || null);
  if (!sets.length) return json({ error: "Nothing to update" }, 400);

  values.push(id);
  try {
    const rows = await db().query(
      `UPDATE bookings SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${BOOKING_COLUMNS}`,
      values,
    );
    if (!rows.length) return json({ error: "Booking not found" }, 404);
    return json({ booking: rows[0] });
  } catch (err) {
    if (isUniqueViolation(err)) return json({ error: "That stylist already has a booking at that time." }, 409);
    console.error("Update booking failed", err);
    return json({ error: "Could not update booking" }, 500);
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return unauthorized();
  const id = await bookingId(context);
  if (!id) return json({ error: "Invalid id" }, 400);

  const rows = await db()`DELETE FROM bookings WHERE id = ${id} RETURNING id`;
  if (!(rows as unknown[]).length) return json({ error: "Booking not found" }, 404);
  return json({ ok: true });
}
