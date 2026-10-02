"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Booking } from "@/lib/db";
import { CATEGORIES, SERVICES, STYLISTS } from "@/lib/catalog";
import styles from "./admin.module.css";

export type NewBookingDraft = { date: string; time: string | null };

const DAYS_SHOWN = 14;

// Every 30 minutes across opening hours, so phone and walk-in bookings aren't limited
// to the five slots on the public page.
const TIME_GROUPS = [
  { name: "Morning", from: 9 * 60, to: 12 * 60 },
  { name: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { name: "Evening", from: 17 * 60, to: 22 * 60 },
].map((g) => ({
  name: g.name,
  times: Array.from({ length: (g.to - g.from) / 30 }, (_, i) => toHHMM(g.from + i * 30)),
}));

function toHHMM(minutes: number) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(" ");
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function upcomingDays() {
  const today = new Date();
  return Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return {
      iso: isoDate(d),
      dow: i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString("en-GB", { month: "short" }),
    };
  });
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
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [service, setService] = useState("");
  const [stylist, setStylist] = useState("No preference");
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState<string | null>(draft.time);
  const [confirmed, setConfirmed] = useState(true);
  const [notes, setNotes] = useState("");
  const [taken, setTaken] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [days] = useState(upcomingDays);
  const otherDate = !days.some((d) => d.iso === date);
  const picked = SERVICES[service];
  const takenTimes = stylist === "No preference" ? [] : (taken[stylist] ?? []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Grey out times the chosen stylist already has that day.
  useEffect(() => {
    let current = true;
    fetch(`/api/availability?date=${date}`)
      .then((res) => (res.ok ? res.json() : { taken: {} }))
      .then((data) => current && setTaken(data.taken ?? {}))
      .catch(() => current && setTaken({}));
    return () => {
      current = false;
    };
  }, [date]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!service) return setError("Please choose a treatment.");
    if (!time) return setError("Please choose a time.");
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
    <div className={styles.modalBackdrop} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className={styles.modalHead}>
          <div>
            <h2>New booking</h2>
            <p>For phone calls and walk-ins</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.modalBody}>
          <section className={styles.step}>
            <h3>Customer</h3>
            <div className={styles.formGrid}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" required autoFocus />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
            </div>
          </section>

          <section className={styles.step}>
            <h3>Treatment</h3>
            <div className={styles.tabs}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`${styles.tab} ${category === c.name ? styles.tabOn : ""}`}
                  onClick={() => setCategory(c.name)}
                >
                  {c.name}
                  {c.services.includes(service) && <span className={styles.tabDot} />}
                </button>
              ))}
            </div>
            <div className={styles.serviceGrid}>
              {CATEGORIES.find((c) => c.name === category)!.services.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  className={`${styles.serviceCard} ${service === svc ? styles.serviceOn : ""}`}
                  onClick={() => setService(svc)}
                >
                  <span className={styles.serviceName}>{svc}</span>
                  <span className={styles.serviceMeta}>
                    <span>{durationLabel(SERVICES[svc].minutes)}</span>
                    <strong>QAR {SERVICES[svc].price}</strong>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.step}>
            <h3>Stylist</h3>
            <div className={styles.choiceRow}>
              {STYLISTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.choice} ${stylist === s ? styles.choiceOn : ""}`}
                  style={{ "--c": colors[s] } as CSSProperties}
                  onClick={() => setStylist(s)}
                >
                  <span className={styles.avatarSm} style={{ background: colors[s] }}>
                    {s === "No preference" ? "?" : s[0]}
                  </span>
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.step}>
            <h3>Date</h3>
            <div className={styles.dayStrip}>
              {days.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  className={`${styles.dayChip} ${date === d.iso ? styles.dayChipOn : ""}`}
                  onClick={() => setDate(d.iso)}
                >
                  <span className={styles.dayChipDow}>{d.dow}</span>
                  <span className={styles.dayChipNum}>{d.day}</span>
                  <span className={styles.dayChipMonth}>{d.month}</span>
                </button>
              ))}
              <label className={`${styles.dayChip} ${styles.dayChipOther} ${otherDate ? styles.dayChipOn : ""}`}>
                <span className={styles.dayChipDow}>{otherDate ? "Picked" : "Other"}</span>
                <span className={styles.dayChipNum}>{otherDate ? dateLabel(date).split(" ")[1] : "+"}</span>
                <span className={styles.dayChipMonth}>{otherDate ? dateLabel(date).split(" ")[2] : "date"}</span>
                <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
              </label>
            </div>
          </section>

          <section className={styles.step}>
            <h3>Time</h3>
            <div className={styles.timeGroups}>
              {TIME_GROUPS.map((g) => (
                <div key={g.name}>
                  <div className={styles.timeGroupName}>{g.name}</div>
                  <div className={styles.timeGrid}>
                    {g.times.map((t) => {
                      const busy = takenTimes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={busy}
                          title={busy ? `${stylist} is booked` : undefined}
                          className={`${styles.timeChip} ${time === t ? styles.timeChipOn : ""}`}
                          onClick={() => setTime(t)}
                        >
                          {timeLabel(t)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.step}>
            <h3>Status</h3>
            <div className={styles.choiceRow}>
              <button
                type="button"
                className={`${styles.choice} ${confirmed ? styles.choiceOn : ""}`}
                style={{ "--c": "#23683a" } as CSSProperties}
                onClick={() => setConfirmed(true)}
              >
                Confirmed
              </button>
              <button
                type="button"
                className={`${styles.choice} ${!confirmed ? styles.choiceOn : ""}`}
                style={{ "--c": "#a8671a" } as CSSProperties}
                onClick={() => setConfirmed(false)}
              >
                To confirm
              </button>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes: allergies, preferences, anything to remember… (optional)"
            />
          </section>
        </div>

        <footer className={styles.modalFoot}>
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.footRow}>
            <div className={styles.footSummary}>
              {picked ? (
                <>
                  <strong>{service}</strong>
                  <span>
                    {dateLabel(date)}
                    {time && ` · ${timeLabel(time)}–${timeLabel(toHHMM(toMinutes(time) + picked.minutes))}`} · {stylist}
                  </span>
                </>
              ) : (
                <span>Choose a treatment and time</span>
              )}
            </div>
            {picked && <span className={styles.price}>QAR {picked.price}</span>}
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add booking"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
