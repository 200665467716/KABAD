"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Select, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AvailabilityView } from "@/lib/domain-types";
import { suggestRange } from "@/lib/slots";
import { zoneChoices, zoneCity } from "@/lib/time-zones";

type Range = { startMin: number; endMin: number };
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
type Weekday = (typeof WEEKDAYS)[number];
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Weekly ranges, days off, time zone and video link of a mentor (screen M7). */
export function AvailabilityForm({ initial }: { initial: AvailabilityView }) {
  const t = useTranslations("mentoring");
  const format = useFormatter();
  const [week, setWeek] = useState<Record<Weekday, Range[]>>(() => {
    const w = Object.fromEntries(WEEKDAYS.map((d) => [d, [] as Range[]])) as Record<Weekday, Range[]>;
    for (const r of initial.ranges) w[r.weekday as Weekday].push({ startMin: r.startMin, endMin: r.endMin });
    return w;
  });
  // The pill whose hours are being changed, if any (M8).
  const [editing, setEditing] = useState<{ day: Weekday; index: number } | null>(null);
  const [blocked, setBlocked] = useState(initial.blocked.map((b) => ({ day: b.day, reason: b.reason ?? "" })));
  const [newDay, setNewDay] = useState("");
  const [newReason, setNewReason] = useState("");
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [meetingUrl, setMeetingUrl] = useState(initial.meetingUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string; field?: string } | null>(null);

  const setDay = (d: Weekday, ranges: Range[]) => setWeek((w) => ({ ...w, [d]: ranges }));
  // The new range never overlaps the others; a full day offers none (src/lib/slots.ts).
  const addRange = (d: Weekday) => {
    const next = suggestRange(week[d]);
    if (!next) return;
    setDay(d, [...week[d], next]);
    // The new pill opens at once, so its hours can be set.
    setEditing({ day: d, index: week[d].length });
  };
  const zones = zoneChoices(timeZone);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/mentoring/availability", {
        method: "PUT",
        body: {
          timeZone,
          meetingUrl: meetingUrl.trim(),
          ranges: WEEKDAYS.flatMap((weekday) => week[weekday].map((r) => ({ weekday, ...r }))),
          blocked: blocked.map((b) => ({ day: b.day, reason: b.reason || undefined })),
        },
      });
      setMessage({ tone: "success", text: t("availability.saved") });
    } catch (e) {
      setMessage({ tone: "danger", text: e instanceof ApiError ? e.message : t("error"), field: e instanceof ApiError ? e.field : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Page narrow>
        <p className="text-[15px] leading-[22px]">{t("availability.intro")}</p>
        <section aria-labelledby="md-week" className="grid gap-1 rounded-lg border-2 border-line-strong bg-raised p-4">
          <h2 id="md-week" className="mb-2 font-display text-md font-extrabold uppercase">
            {t("availability.week")}
          </h2>
          {WEEKDAYS.map((d) => {
            const on = week[d].length > 0;
            const dayName = t(`availability.weekdays.${d}`);
            return (
              <div key={d} className="grid grid-cols-[48px_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-line py-2.5 [&+&]:border-t-2">
                <span className="text-sm font-extrabold">{t(`availability.short.${d}`)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t("availability.availableOn", { day: dayName })}
                  onClick={() => {
                    setEditing(null);
                    setDay(d, on ? [] : [{ startMin: 18 * 60, endMin: 20 * 60 }]);
                  }}
                  className={cn("relative h-6.5 w-11 shrink-0 rounded-full border-2 border-line-strong", on ? "border-brand bg-brand" : "bg-raised")}
                >
                  <span className={cn("absolute top-[3px] size-4 rounded-full transition-[left]", on ? "left-[21px] bg-on-brand" : "left-[3px] bg-ink")} />
                </button>
                {/* M8: each range is a pill; touching it opens its hours just below. */}
                <div className="flex min-h-11 flex-wrap items-center justify-end gap-1.5">
                  {on ? (
                    <>
                      {week[d].map((r, i) => {
                        const open = editing?.day === d && editing.index === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            aria-expanded={open}
                            aria-label={t("availability.editRange", { day: dayName, range: `${hm(r.startMin)} – ${hm(r.endMin)}` })}
                            onClick={() => setEditing(open ? null : { day: d, index: i })}
                            className={cn("inline-flex h-9 items-center rounded-md px-2.5 text-[13px] font-extrabold tabular", open ? "bg-brand text-on-brand" : "bg-[var(--mist)] text-[var(--indigo)]")}
                          >
                            {hm(r.startMin)} – {r.endMin === 24 * 60 ? "24:00" : hm(r.endMin)}
                          </button>
                        );
                      })}
                      {suggestRange(week[d]) && (
                        <button type="button" onClick={() => addRange(d)} className="inline-grid size-11 place-items-center rounded-full text-ink hover:bg-bg" aria-label={t("availability.addRange", { day: dayName })}>
                          <Icon name="plus" size={20} />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] font-semibold text-subtle">{t("availability.unavailable")}</span>
                  )}
                </div>
                {on && editing?.day === d && week[d][editing.index] && (
                  <div className="col-span-3 flex flex-wrap items-center justify-end gap-1.5 rounded-md bg-bg p-2">
                    <select aria-label={`${dayName} ${t("availability.from")}`} value={week[d][editing.index].startMin} onChange={(e) => setDay(d, week[d].map((x, j) => (j === editing.index ? { ...x, startMin: Number(e.target.value) } : x)))} className="h-10 rounded-md border-2 border-line-strong bg-raised px-2 text-sm font-bold tabular">
                      {TIMES.slice(0, -1).map((m) => (
                        <option key={m} value={m}>
                          {hm(m)}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted">{t("availability.to")}</span>
                    <select aria-label={`${dayName} ${t("availability.to")}`} value={week[d][editing.index].endMin} onChange={(e) => setDay(d, week[d].map((x, j) => (j === editing.index ? { ...x, endMin: Number(e.target.value) } : x)))} className="h-10 rounded-md border-2 border-line-strong bg-raised px-2 text-sm font-bold tabular">
                      {TIMES.slice(1).map((m) => (
                        <option key={m} value={m}>
                          {m === 24 * 60 ? "24:00" : hm(m)}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("availability.removeRange", { range: `${hm(week[d][editing.index].startMin)} – ${hm(week[d][editing.index].endMin)}` })}
                      onClick={() => {
                        setDay(d, week[d].filter((_, j) => j !== editing.index));
                        setEditing(null);
                      }}
                    >
                      {t("availability.remove")}
                    </Button>
                    <Button variant="ink" size="sm" onClick={() => setEditing(null)}>
                      {t("availability.done")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section aria-labelledby="md-blocked" className="grid gap-3 rounded-lg border-2 border-line-strong bg-raised p-4">
          <div className="grid">
            <h2 id="md-blocked" className="font-display text-md font-extrabold uppercase">
              {t("availability.blocked")}
            </h2>
            <span className="text-[13px] text-muted">{t("availability.blockedHint")}</span>
          </div>
          {blocked.length === 0 ? (
            <p className="text-sm text-muted">{t("availability.noBlocked")}</p>
          ) : (
            <ul className="grid gap-1.5">
              {blocked.map((b) => {
                const label = format.dateTime(new Date(`${b.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
                return (
                  <li key={b.day} className="flex items-center gap-2 rounded-md bg-bg px-3 py-1.5">
                    <span className="min-w-0 flex-1 text-sm">
                      <b className="capitalize">{label}</b>
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                    <button type="button" aria-label={t("availability.removeBlocked", { day: label })} onClick={() => setBlocked(blocked.filter((x) => x.day !== b.day))} className="inline-grid size-10 place-items-center rounded-full text-muted hover:bg-raised">
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
            <TextField id="blocked-day" type="date" label={t("availability.blockedDay")} value={newDay} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setNewDay(e.target.value)} />
            <TextField id="blocked-reason" label={t("availability.blockedReason")} value={newReason} maxLength={80} onChange={(e) => setNewReason(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!newDay || blocked.some((b) => b.day === newDay)}
              onClick={() => {
                setBlocked([...blocked, { day: newDay, reason: newReason.trim() }].sort((a, b) => a.day.localeCompare(b.day)));
                setNewDay("");
                setNewReason("");
              }}
            >
              {t("availability.addBlocked")}
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border-2 border-line-strong bg-raised p-4">
          <Select id="zone" label={t("availability.zone")} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {zoneCity(z)}
              </option>
            ))}
          </Select>
          <TextField
            id="meeting"
            inputMode="url"
            label={t("availability.meeting")}
            hint={t("availability.meetingHint")}
            placeholder="meet.google.com/…"
            value={meetingUrl}
            maxLength={200}
            onChange={(e) => setMeetingUrl(e.target.value)}
            error={message?.field === "meetingUrl" ? message.text : undefined}
          />
        </section>
        {message && message.field !== "meetingUrl" && (
          <Alert tone={message.tone} role={message.tone === "danger" ? "alert" : "status"}>
            {message.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button size="lg" block onClick={save} disabled={busy}>
          {t("availability.save")}
        </Button>
      </ActionBar>
    </>
  );
}
