import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}

// Dates/times are formatted in SQL so they come back as plain strings,
// not JS Dates shifted by the server's timezone.
export const BOOKING_COLUMNS = `
  id, service, price, duration_min, stylist,
  to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
  to_char(booking_time, 'HH24:MI') AS booking_time,
  customer_name, customer_phone, status, notes, created_at`;

export type Booking = {
  id: number;
  service: string;
  price: number;
  duration_min: number;
  stylist: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
};

export const STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const;
export type BookingStatus = (typeof STATUSES)[number];
