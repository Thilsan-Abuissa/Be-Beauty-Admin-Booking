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
