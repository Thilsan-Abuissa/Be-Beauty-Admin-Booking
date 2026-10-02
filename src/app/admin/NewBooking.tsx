"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Booking } from "@/lib/db";
import { SERVICES, STYLISTS } from "@/lib/catalog";
import styles from "./admin.module.css";

export type NewBookingDraft = { date: string; time: string };

// Every 15 minutes across opening hours, so phone and walk-in bookings aren't limited
// to the five slots on the public page.
const TIMES = Array.from({ length: (22 - 9) * 4 }, (_, i) => {
  const minutes = 9 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(" ");
}

type Props = {
  draft: NewBookingDraft;
  colors: Record<string, string>;
  onClose: () => void;
  onSaved: (booking: Booking) => void;
};

export default function NewBooking({ draft, colors, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [stylist, setStylist] = useState("No preference");
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(TIMES.includes(draft.time) ? draft.time : "10:00");
  const [confirmed, setConfirmed] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const picked = SERVICES[service];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          service,
          stylist,
          date,
          time,
          notes,
          status: confirmed ? "confirmed" : "pending",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return window.location.reload();
      if (!res.ok) return setError(data.error || "Could not save the booking.");
      onSaved(data.booking as Booking);
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerTop}>
          <div className={styles.drawerHead}>
            <span className={`${styles.badge} ${styles.badge_confirmed}`}>New booking</span>
            <button className={styles.close} onClick={onClose} aria-label="Close" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2>Add a booking</h2>
          <div className={styles.personPhone}>For phone calls and walk-ins</div>
        </div>

        <form className={styles.drawerBody} onSubmit={submit}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Customer name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara Ahmed" required autoFocus />
            </label>
            <label className={styles.field}>
              <span>
                Phone <span className={styles.optional}>(optional)</span>
              </span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 5555 1234" />
            </label>
          </div>

          <label className={styles.field}>
            Treatment
            <select value={service} onChange={(e) => setService(e.target.value)} required>
              <option value="" disabled>
                Choose a treatment…
              </option>
              {Object.entries(SERVICES).map(([svc, info]) => (
                <option key={svc} value={svc}>
                  {svc} · QAR {info.price} · {durationLabel(info.minutes)}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.field}>
            Stylist
            <div className={styles.choiceRow}>
              {STYLISTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.choice} ${stylist === s ? styles.choiceOn : ""}`}
                  style={{ "--c": colors[s] } as CSSProperties}
                  onClick={() => setStylist(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className={styles.field}>
              Time
              <select value={time} onChange={(e) => setTime(e.target.value)} required>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {timeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.field}>
            Status
            <div className={styles.choiceRow}>
              <button
                type="button"
                className={`${styles.choice} ${confirmed ? styles.choiceOn : ""}`}
                onClick={() => setConfirmed(true)}
              >
                Confirmed
              </button>
              <button
                type="button"
                className={`${styles.choice} ${!confirmed ? styles.choiceOn : ""}`}
                onClick={() => setConfirmed(false)}
              >
                To confirm
              </button>
            </div>
          </div>

          <label className={styles.notesLabel}>
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, preferences, anything to remember…"
            />
          </label>

          {picked && (
            <div className={styles.summary}>
              <span>
                {durationLabel(picked.minutes)} · ends {timeLabel(endTime(time, picked.minutes))}
              </span>
              <span className={styles.price}>QAR {picked.price}</span>
            </div>
          )}

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.actions}>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add booking"}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function endTime(start: string, minutes: number) {
  const [h, m] = start.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
