const SALON_TZ = process.env.SALON_TIMEZONE || "Asia/Qatar";

// "YYYY-MM-DD" for today in the salon's timezone (Vercel servers run in UTC).
export function salonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SALON_TZ }).format(new Date());
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Minutes since midnight right now in the salon's timezone.
export function salonNowMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SALON_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get("hour") * 60 + get("minute");
}

// Same-day bookings need this much notice. Keep in sync with public/booking.html.
export const MIN_NOTICE_MIN = 30;

export function isTooSoon(date: string, time: string) {
  if (date !== salonToday()) return false;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m < salonNowMinutes() + MIN_NOTICE_MIN;
}
