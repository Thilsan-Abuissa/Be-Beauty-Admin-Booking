import { db } from "@/lib/db";
import { DATE_RE, json } from "@/lib/http";

// Public: which time slots each stylist already has on a date (no customer details).
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) return json({ error: "date is required" }, 400);

  const rows = (await db()`
    SELECT stylist, to_char(booking_time, 'HH24:MI') AS time
    FROM bookings
    WHERE booking_date = ${date} AND status <> 'cancelled' AND stylist <> 'No preference'`) as {
    stylist: string;
    time: string;
  }[];

  const taken: Record<string, string[]> = {};
  for (const row of rows) (taken[row.stylist] ??= []).push(row.time);
  return json({ taken });
}
