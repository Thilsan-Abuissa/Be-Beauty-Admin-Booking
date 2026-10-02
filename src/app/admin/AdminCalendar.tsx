"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { Booking, BookingStatus } from "@/lib/db";
import styles from "./admin.module.css";

const STYLIST_COLORS: Record<string, string> = {
  Amal: "#b45c50",
  Fathima: "#c69a5c",
  Reem: "#7a5c8f",
  "No preference": "#6b8f7a",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const REFRESH_MS = 60_000;
const MOBILE_QUERY = "(max-width: 720px)";

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toEvent(b: Booking): EventInput {
  const start = new Date(`${b.booking_date}T${b.booking_time}:00`);
  const end = new Date(start.getTime() + b.duration_min * 60_000);
  const color = STYLIST_COLORS[b.stylist] ?? "#6b5250";
  return {
    id: String(b.id),
    title: `${b.customer_name} · ${b.service}`,
    start,
    end,
    backgroundColor: color,
    borderColor: color,
    classNames: [styles[`status_${b.status}`]],
    extendedProps: { booking: b },
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Session expired: full reload so the server-side check sends us to login.
    window.location.reload();
    throw new Error("Logged out");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

export default function AdminCalendar({ stylists }: { stylists: string[] }) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const hiddenRef = useRef(hidden);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );

  const refetch = useCallback(() => calendarRef.current?.getApi().refetchEvents(), []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  useEffect(() => {
    // Pick up bookings made on the website without a manual reload.
    const timer = window.setInterval(refetch, REFRESH_MS);
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  useEffect(() => {
    hiddenRef.current = hidden;
    refetch();
  }, [hidden, refetch]);

  const loadEvents = useCallback(
    async (info: EventSourceFuncArg, success: (events: EventInput[]) => void, failure: (err: Error) => void) => {
      try {
        const params = new URLSearchParams({ start: localDate(info.start), end: localDate(info.end) });
        const { bookings } = await api<{ bookings: Booking[] }>(`/api/bookings?${params}`);
        success(bookings.filter((b) => !hiddenRef.current.has(b.stylist)).map(toEvent));
      } catch (err) {
        failure(err as Error);
        showToast((err as Error).message);
      }
    },
    [showToast],
  );

  function openBooking(arg: EventClickArg) {
    const booking = arg.event.extendedProps.booking as Booking;
    setSelected(booking);
    setNotes(booking.notes ?? "");
  }

  async function onDrop(arg: EventDropArg) {
    const start = arg.event.start;
    if (!start) return arg.revert();
    try {
      await api(`/api/bookings/${arg.event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ booking_date: localDate(start), booking_time: localTime(start) }),
      });
      showToast("Booking moved");
      refetch();
    } catch (err) {
      arg.revert();
      showToast((err as Error).message);
    }
  }

  async function update(changes: Partial<Booking>) {
    if (!selected) return;
    setBusy(true);
    try {
      const { booking } = await api<{ booking: Booking }>(`/api/bookings/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setSelected(booking);
      showToast("Saved");
      refetch();
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete the booking for ${selected.customer_name}? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/bookings/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      showToast("Booking deleted");
      refetch();
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  function toggleStylist(name: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <h1>Be Beauty</h1>
          <span className={styles.sub}>Bookings calendar</span>
        </div>
        <div className={styles.topActions}>
          <button className="btn btn-outline" onClick={refetch}>Refresh</button>
          <button className="btn btn-outline" onClick={logout}>Log out</button>
        </div>
      </header>

      <div className={styles.legend}>
        {stylists.map((name) => (
          <button
            key={name}
            className={`${styles.legendItem} ${hidden.has(name) ? styles.legendOff : ""}`}
            onClick={() => toggleStylist(name)}
            title={hidden.has(name) ? "Show" : "Hide"}
          >
            <span className={styles.swatch} style={{ background: STYLIST_COLORS[name] }} />
            {name}
          </button>
        ))}
      </div>

      <div className={styles.calendarCard}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isMobile ? "listWeek" : "timeGridWeek"}
          key={isMobile ? "mobile" : "desktop"}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "listWeek,timeGridDay" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }
          }
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "List" }}
          events={loadEvents}
          eventClick={openBooking}
          editable
          eventDurationEditable={false}
          eventDrop={onDrop}
          slotMinTime="09:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          firstDay={6}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          noEventsContent="No bookings in this period"
        />
      </div>

      {selected && (
        <div className={styles.backdrop} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <span className={`${styles.badge} ${styles[`badge_${selected.status}`]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
              <button className={styles.close} onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>

            <h2>{selected.customer_name}</h2>
            <a className={styles.phone} href={`tel:${selected.customer_phone}`}>{selected.customer_phone}</a>
            <a
              className={styles.whatsapp}
              href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>

            <dl className={styles.details}>
              <dt>Treatment</dt>
              <dd>{selected.service}</dd>
              <dt>When</dt>
              <dd>
                {formatDate(selected.booking_date)}
                <br />
                {formatTime(selected.booking_time)} · {selected.duration_min} min
              </dd>
              <dt>Stylist</dt>
              <dd>{selected.stylist}</dd>
              <dt>Price</dt>
              <dd>QAR {selected.price}</dd>
              <dt>Booked on</dt>
              <dd>{new Date(selected.created_at).toLocaleString()}</dd>
            </dl>

            <label className={styles.notesLabel}>
              Notes
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            {notes !== (selected.notes ?? "") && (
              <button className="btn btn-outline" disabled={busy} onClick={() => update({ notes })}>
                Save notes
              </button>
            )}

            <div className={styles.actions}>
              {selected.status !== "confirmed" && selected.status !== "completed" && (
                <button className="btn btn-primary" disabled={busy} onClick={() => update({ status: "confirmed" })}>
                  Confirm
                </button>
              )}
              {selected.status === "confirmed" && (
                <button className="btn btn-primary" disabled={busy} onClick={() => update({ status: "completed" })}>
                  Mark completed
                </button>
              )}
              {selected.status !== "cancelled" ? (
                <button className="btn btn-outline" disabled={busy} onClick={() => update({ status: "cancelled" })}>
                  Cancel booking
                </button>
              ) : (
                <button className="btn btn-outline" disabled={busy} onClick={() => update({ status: "pending" })}>
                  Restore
                </button>
              )}
              <button className="btn btn-danger" disabled={busy} onClick={remove}>Delete</button>
            </div>
            <p className={styles.hint}>Tip: drag a booking on the calendar to reschedule it.</p>
          </aside>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
