-- Be Beauty bookings. Safe to run more than once.
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  service        TEXT        NOT NULL,
  price          INTEGER     NOT NULL,
  duration_min   INTEGER     NOT NULL,
  stylist        TEXT        NOT NULL DEFAULT 'No preference',
  booking_date   DATE        NOT NULL,
  booking_time   TIME        NOT NULL,
  customer_name  TEXT        NOT NULL,
  customer_phone TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (booking_date);

-- A named stylist can't have two active bookings at the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stylist_slot_uniq
  ON bookings (stylist, booking_date, booking_time)
  WHERE status <> 'cancelled' AND stylist <> 'No preference';
