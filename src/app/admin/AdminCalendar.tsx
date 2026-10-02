"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import type { Booking, BookingStatus } from "@/lib/db";
import styles from "./admin.module.css";
import NewBooking, { type NewBookingDraft } from "./NewBooking";

const STYLIST_COLORS: Record<string, string> = {
  Amal: "#b45c50",
  Fathima: "#c69a5c",
  Reem: "#7a5c8f",
  "No preference": "#6b8f7a",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "To confirm",
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

function stylistColor(name: string) {
  return STYLIST_COLORS[name] ?? "#6b5250";
}

function initial(name: string) {
  return name === "No preference" ? "?" : name.trim().charAt(0).toUpperCase();
}

function toEvent(b: Booking): EventInput {
  const start = new Date(`${b.booking_date}T${b.booking_time}:00`);
  const end = new Date(start.getTime() + b.duration_min * 60_000);
  return { id: String(b.id), title: `${b.customer_name} · ${b.service}`, start, end, extendedProps: { booking: b } };
}

function renderEvent(arg: EventContentArg) {
  const b = arg.event.extendedProps.booking as Booking;
  const style = { "--c": stylistColor(b.stylist) } as CSSProperties;
  const statusClass = styles[`status_${b.status}`];
  const pending = b.status === "pending" && <span className={styles.pendingTag}>To confirm</span>;
  if (arg.view.type.startsWith("timeGrid")) {
    return (
      <div className={`${styles.event} ${statusClass}`} style={style} title={`${b.customer_name} · ${b.service} · ${b.stylist}`}>
        <div className={styles.eventTop}>
          <span className={styles.eventAvatar}>{initial(b.stylist)}</span>
          <span className={styles.eventName}>{b.customer_name}</span>
        </div>
        <div className={styles.eventTime}>{arg.timeText}</div>
        {/* Short bookings only have room for the name and time. */}
        {b.duration_min >= 60 && <div className={styles.eventService}>{b.service}</div>}
        {b.duration_min >= 90 && pending}
      </div>
    );
  }
  return (
    <div className={`${styles.eventInline} ${statusClass}`} style={style}>
      <span className={styles.eventDot} />
      {!arg.view.type.startsWith("list") && <span className={styles.eventTime}>{arg.timeText}</span>}
      <span className={styles.eventName}>{b.customer_name}</span>
      <span className={styles.eventService}>
        {b.service} · {b.stylist}
      </span>
      {pending}
    </div>
  );
}

function renderDayHeader(arg: DayHeaderContentArg) {
  if (!arg.view.type.startsWith("timeGrid")) return arg.text;
  const cls = [styles.dayHead, arg.isToday && styles.dayToday, arg.isPast && styles.dayPast].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <span className={styles.dayName}>{arg.date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
      <span className={styles.dayNum}>{arg.date.getDate()}</span>
    </div>
  );
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

const Icon = {
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className={styles.detail}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <div className={styles.detailLabel}>{label}</div>
        <div className={styles.detailValue}>{children}</div>
      </div>
    </div>
  );
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
  const [shown, setShown] = useState<Booking[]>([]);
  const [period, setPeriod] = useState("");
  const [draft, setDraft] = useState<NewBookingDraft | null>(null);
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
        const visible = bookings.filter((b) => !hiddenRef.current.has(b.stylist));
        setShown(visible);
        success(visible.map(toEvent));
      } catch (err) {
        failure(err as Error);
        showToast((err as Error).message);
      }
    },
    [showToast],
  );

  const stats = useMemo(() => {
    const active = shown.filter((b) => b.status !== "cancelled");
    return {
      total: active.length,
      pending: shown.filter((b) => b.status === "pending").length,
      confirmed: shown.filter((b) => b.status === "confirmed" || b.status === "completed").length,
      revenue: active.reduce((sum, b) => sum + b.price, 0),
    };
  }, [shown]);

  function onDatesSet(arg: DatesSetArg) {
    setPeriod(arg.view.title);
  }

  function newBooking(date = new Date(), withTime = false) {
    setSelected(null);
    setDraft({ date: localDate(date), time: withTime ? localTime(date) : "10:00" });
  }

  // Clicking an empty spot on the calendar starts a booking at that day and time.
  function onDateClick(arg: DateClickArg) {
    newBooking(arg.date, !arg.allDay);
  }

  function onBookingAdded(booking: Booking) {
    setDraft(null);
    showToast(`Booking added for ${booking.customer_name}`);
    calendarRef.current?.getApi().gotoDate(booking.booking_date);
    refetch();
  }

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

  async function update(changes: Partial<Booking>, message = "Saved") {
    if (!selected) return;
    setBusy(true);
    try {
      const { booking } = await api<{ booking: Booking }>(`/api/bookings/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setSelected(booking);
      showToast(message);
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
    <>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brand}>
            <Image src="/logo.png" alt="Be Beauty" width={360} height={270} priority />
            <div>
              <h1>Bookings</h1>
              <p>{period || "Your appointments at a glance"}</p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={`${styles.heroBtn} ${styles.heroBtnPrimary}`} onClick={() => newBooking()}>
              {Icon.plus}
              <span>New booking</span>
            </button>
            <button className={styles.heroBtn} onClick={refetch} aria-label="Refresh">
              {Icon.refresh}
              <span>Refresh</span>
            </button>
            <button className={styles.heroBtn} onClick={logout} aria-label="Log out">
              {Icon.logout}
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Bookings</div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statHint}>in this view</div>
          </div>
          <div className={`${styles.stat} ${stats.pending ? styles.statAccent : ""}`}>
            <div className={styles.statLabel}>To confirm</div>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statHint}>{stats.pending ? "waiting for you" : "all caught up"}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Confirmed</div>
            <div className={styles.statValue}>{stats.confirmed}</div>
            <div className={styles.statHint}>ready to go</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Expected</div>
            <div className={styles.statValue}>QAR {stats.revenue.toLocaleString()}</div>
            <div className={styles.statHint}>excluding cancelled</div>
          </div>
        </section>

        <div className={styles.legend}>
          <span className={styles.legendTitle}>Stylists</span>
          {stylists.map((name) => (
            <button
              key={name}
              className={`${styles.legendItem} ${hidden.has(name) ? styles.legendOff : ""}`}
              onClick={() => toggleStylist(name)}
              title={hidden.has(name) ? `Show ${name}` : `Hide ${name}`}
            >
              <span className={styles.avatarSm} style={{ background: stylistColor(name) }}>
                {initial(name)}
              </span>
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
            eventContent={renderEvent}
            datesSet={onDatesSet}
            eventClick={openBooking}
            dateClick={onDateClick}
            editable
            eventDurationEditable={false}
            eventDrop={onDrop}
            slotMinTime="09:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator
            height="auto"
            firstDay={6}
            dayHeaderContent={renderDayHeader}
            slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
            scrollTime="10:00:00"
            eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
            noEventsContent="No bookings in this period"
          />
        </div>
      </div>

      {selected && (
        <div className={styles.backdrop} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerTop}>
              <div className={styles.drawerHead}>
                <span className={`${styles.badge} ${styles[`badge_${selected.status}`]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
                <button className={styles.close} onClick={() => setSelected(null)} aria-label="Close">
                  {Icon.close}
                </button>
              </div>
              <div className={styles.person}>
                <span className={styles.avatar} style={{ background: stylistColor(selected.stylist) }}>
                  {selected.customer_name.trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2>{selected.customer_name}</h2>
                  <div className={styles.personPhone}>{selected.customer_phone}</div>
                </div>
              </div>
              <div className={styles.contact}>
                <a className={styles.contactBtn} href={`tel:${selected.customer_phone}`}>
                  {Icon.phone} Call
                </a>
                <a
                  className={`${styles.contactBtn} ${styles.whatsappBtn}`}
                  href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {Icon.whatsapp} WhatsApp
                </a>
              </div>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.details}>
                <Detail icon={Icon.sparkle} label="Treatment">
                  {selected.service}
                </Detail>
                <Detail icon={Icon.calendar} label="Date">
                  {formatDate(selected.booking_date)}
                </Detail>
                <Detail icon={Icon.clock} label="Time">
                  {formatTime(selected.booking_time)} · {selected.duration_min} min
                </Detail>
                <Detail icon={Icon.user} label="Stylist">
                  {selected.stylist}
                </Detail>
                <Detail icon={Icon.tag} label="Price">
                  <span className={styles.price}>QAR {selected.price}</span>
                </Detail>
              </div>

              <label className={styles.notesLabel}>
                Notes
                <textarea
                  rows={3}
                  placeholder="Allergies, preferences, anything to remember…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              {notes !== (selected.notes ?? "") && (
                <button
                  className={`btn btn-outline ${styles.saveNotes}`}
                  disabled={busy}
                  onClick={() => update({ notes }, "Notes saved")}
                >
                  Save notes
                </button>
              )}

              <div className={styles.actions}>
                {selected.status !== "confirmed" && selected.status !== "completed" && selected.status !== "cancelled" && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => update({ status: "confirmed" }, "Booking confirmed")}
                  >
                    Confirm booking
                  </button>
                )}
                {selected.status === "confirmed" && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => update({ status: "completed" }, "Marked as completed")}
                  >
                    Mark as completed
                  </button>
                )}
                <div className={styles.actionsRow}>
                  {selected.status !== "cancelled" ? (
                    <button
                      className="btn btn-outline"
                      disabled={busy}
                      onClick={() => update({ status: "cancelled" }, "Booking cancelled")}
                    >
                      Cancel booking
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline"
                      disabled={busy}
                      onClick={() => update({ status: "pending" }, "Booking restored")}
                    >
                      Restore
                    </button>
                  )}
                  <button className="btn btn-danger" disabled={busy} onClick={remove}>
                    Delete
                  </button>
                </div>
              </div>
              <p className={styles.hint}>
                Booked {new Date(selected.created_at).toLocaleString()} · Drag a booking on the calendar to move it.
              </p>
            </div>
          </aside>
        </div>
      )}

      {draft && (
        <NewBooking draft={draft} colors={STYLIST_COLORS} onClose={() => setDraft(null)} onSaved={onBookingAdded} />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}
