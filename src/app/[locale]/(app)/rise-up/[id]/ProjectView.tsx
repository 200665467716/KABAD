"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { RiseSymbol } from "@/components/features/rise/RiseSymbol";
import { Page } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented, Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, AvatarGroup, Badge, Overline, Tag, TagList } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { RiseEventView, RiseProjectDetail } from "@/lib/domain-types";
import { initials } from "@/lib/format";
import { localizeRoomTitle } from "@/lib/system-text";

type Tab = "talk" | "events" | "members" | "info";

/** Event times follow the member's profile time zone, as on the event page and in the notifications. */
export function ProjectView({ project: p, viewerId, timeZone, now }: { project: RiseProjectDetail; viewerId: string; timeZone: string; now: number }) {
  const t = useTranslations("rise");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("talk");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function membership(join: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rise/${p.id}/members`, join ? { method: "POST", body: {} } : { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("project.error"));
    } finally {
      setBusy(false);
    }
  }

  const others = Math.max(0, p.members - p.avatars.length);
  const live = p.event?.live ?? false;
  return (
    <>
    <Page className="flex-1">
      <section className="grid gap-2.5 rounded-xl border-2 border-line-strong bg-accent p-4 text-on-accent shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-extrabold tracking-[0.1em] text-[var(--maize-deep)] uppercase">
            {t(`domain.${p.domain}`)} · {t("countries", { count: p.countries })}
          </span>
          <RiseSymbol size={40} className="text-ink" />
        </div>
        <h2 className="font-display text-xl leading-[26px] font-extrabold">{p.name}</h2>
        <p className="text-sm leading-5 font-semibold text-[var(--maize-deep)]">{p.summary}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AvatarGroup className="[&>*]:shadow-[0_0_0_2px_var(--maize)]">
              {p.avatars.map((a) => (
                <Avatar key={a.id} initials={initials(a.name)} size="sm" />
              ))}
              {others > 0 && <Avatar initials={`+${others}`} size="sm" tone="neutral" />}
            </AvatarGroup>
            <b className="text-sm">{t("devs", { count: p.members })}</b>
          </span>
          {p.isMember ? <Badge tone="success">{t("project.member")}</Badge> : null}
        </div>
      </section>

      {p.event && <EventStrip event={p.event} isMember={p.isMember} t={t} format={format} timeZone={timeZone} />}

      {!p.isMember && (
        <Button size="lg" block disabled={busy} onClick={() => membership(true)}>
          {t("project.join")}
        </Button>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}

      <Segmented
        label={t("project.tabsLabel")}
        // Four tabs: each takes the width of its word, so they fit on a 360 px screen.
        className="flex w-full [&>button]:flex-auto [&>button]:px-2 [&>button]:text-[13px] sm:[&>button]:px-4 sm:[&>button]:text-sm"
        value={tab}
        onChange={setTab}
        items={[
          { value: "talk", label: t("project.tabTalk") },
          { value: "events", label: t("project.tabEvents") },
          { value: "members", label: t("project.tabMembers") },
          { value: "info", label: t("project.tabInfo") },
        ]}
      />

      {tab === "talk" && (
        <div className="grid gap-3">
          {/* A room is a video call opened now for the project's members. One at a time. */}
          {p.isMember && !live && <RoomButton projectId={p.id} />}
          {p.posts.map((post) => (
            <article key={post.id} className="grid gap-2 rounded-lg border-2 border-line-strong bg-raised p-3.5">
              <div className="flex items-center gap-2.5">
                <Avatar initials={initials(post.author?.name ?? "?")} size="sm" />
                <b className="text-sm">{post.author?.name ?? "—"}</b>
                <span className="text-[13px] text-muted">{format.relativeTime(new Date(post.createdAt), now)}</span>
              </div>
              <p className="text-[15px] leading-[22px] whitespace-pre-line">{post.body}</p>
              <Link href={`/rise-up/${p.id}/messages/${post.id}`} className="justify-self-start text-[13px] font-extrabold text-brand-text no-underline">
                {t("project.replies", { count: post.replies })}
              </Link>
            </article>
          ))}
          {p.posts.length === 0 && <p className="py-4 text-center text-muted">{t("project.noPosts")}</p>}
          {!p.isMember && <p className="text-sm text-muted">{t("project.joinToWrite")}</p>}
        </div>
      )}

      {/* The project sheet: what the project is about, always one tap away in its channel. */}
      {tab === "info" && (
        <div className="grid gap-4 rounded-lg border-2 border-line-strong bg-raised p-4">
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
            <dt className="font-extrabold text-muted">{t("info.domain")}</dt>
            <dd className="m-0 font-bold">{t(`domain.${p.domain}`)}</dd>
            <dt className="font-extrabold text-muted">{t("info.initiator")}</dt>
            <dd className="m-0">
              <Link href={`/profil/${p.initiator.id}`} className="font-bold text-brand-text no-underline">
                {p.initiator.name}
              </Link>
            </dd>
            <dt className="font-extrabold text-muted">{t("info.since")}</dt>
            <dd className="m-0 font-bold">{format.dateTime(new Date(p.createdAt), { day: "numeric", month: "long", year: "numeric" })}</dd>
            <dt className="font-extrabold text-muted">{t("info.team")}</dt>
            <dd className="m-0 font-bold">{t("info.teamCount", { members: p.members, countries: p.countries })}</dd>
          </dl>
          <div className="grid gap-1.5 border-t-2 border-line pt-3.5">
            <Overline as="h3">{t("info.summary")}</Overline>
            <p className="text-[15px] leading-[22px]">{p.summary}</p>
          </div>
          <div className="grid gap-1.5">
            <Overline as="h3">{t("project.problem")}</Overline>
            <p className="text-[15px] leading-[22px] whitespace-pre-line">{p.problem}</p>
          </div>
          {p.skills.length > 0 && (
            <div className="grid gap-2">
              <Overline as="h3">{t("project.skills")}</Overline>
              <TagList items={p.skills} />
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <div className="grid gap-2.5">
          {p.events.map((e) => (
            <Link key={e.id} href={`/rise-up/${p.id}/evenements/${e.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-3 text-ink no-underline">
              <span className="grid size-14 content-center justify-items-center rounded-action bg-ink text-raised">
                <b className="font-display text-lg leading-5 font-extrabold">{format.dateTime(new Date(e.startsAt), { day: "numeric", timeZone })}</b>
                <span className="text-[11px] font-extrabold text-accent uppercase">{format.dateTime(new Date(e.startsAt), { month: "short", timeZone })}</span>
              </span>
              <span className="grid min-w-0">
                <b className="truncate text-[15px]">{localizeRoomTitle(e.title, locale)}</b>
                <span className="text-[13px] text-muted">
                  {format.dateTime(new Date(e.startsAt), { hour: "numeric", minute: "2-digit", timeZone })} · {t("event.duration", { minutes: e.minutes })}
                </span>
              </span>
              {e.live ? <Badge tone="live">{t("live")}</Badge> : <Icon name="chevron" size={18} className="text-subtle" />}
            </Link>
          ))}
          {p.events.length === 0 && <p className="py-4 text-center text-muted">{t("project.noEvents")}</p>}
          {p.isMember && (
            <ButtonLink href={`/rise-up/${p.id}/evenements/nouveau`} variant="secondary" icon="plus">
              {t("project.schedule")}
            </ButtonLink>
          )}
        </div>
      )}

      {tab === "members" && (
        <div className="overflow-hidden rounded-lg border-2 border-line-strong bg-raised [&>*+*]:border-t-2 [&>*+*]:border-line">
          {p.people.map((m) => (
            <Link key={m.id} href={`/profil/${m.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-ink no-underline">
              <Avatar initials={initials(m.name)} />
              <span className="grid min-w-0">
                <b className="truncate text-[15px]">{m.name}</b>
                <small className="text-[13px] text-muted">{[m.initiator ? t("project.initiator") : null, m.skill || null].filter(Boolean).join(" · ")}</small>
              </span>
              {m.city ? <Tag>{m.city}</Tag> : <span />}
            </Link>
          ))}
        </div>
      )}

      {p.isMember && (
        <div className="grid gap-2 sm:grid-cols-2">
          {p.conversationId && (
            <ButtonLink href={`/messages/${p.conversationId}`} variant="ink" icon="message" block>
              {t("project.openChat")}
            </ButtonLink>
          )}
          {p.initiator.id !== viewerId && (
            <Button variant="secondary" block disabled={busy} onClick={() => membership(false)}>
              {t("project.leave")}
            </Button>
          )}
        </div>
      )}
    </Page>
    {/* R2: the writing zone stays at the bottom of the channel. */}
    {tab === "talk" && p.isMember && (
      <div className="sticky bottom-0 z-10 border-t-2 border-line-strong bg-raised">
        <div className="mx-auto w-full max-w-[960px] px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom,0px))] lg:px-10">
          <Composer projectId={p.id} dock />
        </div>
      </div>
    )}
    </>
  );
}

/** R2: the band of the live room (ink, maize button), or the next event. */
function EventStrip({ event, isMember, t, format, timeZone }: { event: RiseEventView; isMember: boolean; timeZone: string; t: ReturnType<typeof useTranslations<"rise">>; format: ReturnType<typeof useFormatter> }) {
  const page = `/rise-up/${event.projectId}/evenements/${event.id}`;
  const direct = event.live && isMember && event.meetingUrl;
  const locale = useLocale();
  return (
    <div className="grid items-center gap-2.5 rounded-lg bg-ink px-4 py-3 text-raised sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
      <Link href={page} className="grid min-w-0 gap-0.5 text-raised no-underline">
        <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.12em] uppercase">
          {event.live ? <span aria-hidden="true" className="size-1.5 rounded-full bg-live" /> : null}
          <span className={event.live ? "text-live" : "text-[var(--grey-light)]"}>{event.live ? t("project.liveRoom") : `${t("project.nextEvent")} · ${format.dateTime(new Date(event.startsAt), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone })}`}</span>
        </span>
        <b className="truncate text-sm">{localizeRoomTitle(event.title, locale)}</b>
      </Link>
      {direct ? (
        <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-extrabold text-on-accent no-underline">
          <Icon name="video" size={18} />
          {t("project.openEvent")}
        </a>
      ) : (
        <Link href={page} className="inline-flex h-11 items-center justify-center rounded-md bg-header px-4 text-sm font-extrabold text-on-header no-underline">
          {t("project.seeEvent")}
        </Link>
      )}
    </div>
  );
}

/** « Lancer un salon » : the member pastes a Google Meet link, the other members are told at once. */
function RoomButton({ projectId }: { projectId: string }) {
  const t = useTranslations("rise.room");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rise/${projectId}/rooms`, { body: { title: String(data.get("title") ?? "").trim() || undefined, meetingUrl: String(data.get("meetingUrl") ?? "") } });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" icon="video" className="justify-self-start" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("title")}>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <p className="text-sm font-medium text-muted">{t("text")}</p>
          <TextField id="room-title" name="title" label={t("subject")} hint={t("optional")} placeholder={t("subjectPlaceholder")} maxLength={100} error={error?.field === "title" ? error.text : undefined} />
          <TextField id="room-link" name="meetingUrl" type="url" inputMode="url" label={t("link")} hint={t("linkHint")} placeholder="meet.google.com/abc-defg-hij" error={error?.field === "meetingUrl" ? error.text : undefined} />
          {error && !["title", "meetingUrl"].includes(error.field ?? "") && (
            <Alert tone="danger" role="alert">
              {error.text}
            </Alert>
          )}
          <Button type="submit" variant="ink" block disabled={busy}>
            {busy ? t("starting") : t("start")}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

/** `dock`: the compact form pinned at the bottom of the channel (one line, the label is read by screen readers). */
function Composer({ projectId, parentId, label, placeholder, dock }: { projectId: string; parentId?: string; label?: string; placeholder?: string; dock?: boolean }) {
  const t = useTranslations("rise.project");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rise/${projectId}/posts`, { body: { body, ...(parentId ? { parentId } : {}) } });
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className={dock ? "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" : "grid gap-2"}>
      <label htmlFor={`composer-${parentId ?? projectId}`} className={dock ? "sr-only" : "text-sm font-extrabold"}>
        {label ?? t("composerLabel")}
      </label>
      <textarea
        id={`composer-${parentId ?? projectId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={dock ? 1 : 3}
        maxLength={2000}
        placeholder={placeholder ?? (dock ? t("composerShort") : t("composerPlaceholder"))}
        className={dock ? "max-h-32 min-h-11 w-full resize-none rounded-md border-2 border-line-strong bg-raised px-3.5 py-2 text-base text-ink [field-sizing:content]" : "w-full resize-y rounded-md border-2 border-line-strong bg-raised px-3.5 py-2.5 text-base text-ink"}
      />
      {error && <span className={dock ? "order-last col-span-2 text-sm font-extrabold text-danger" : "text-sm font-extrabold text-danger"}>{error}</span>}
      <Button type="submit" variant="ink" disabled={busy || !body.trim()} className={dock ? undefined : "justify-self-end"}>
        {busy ? t("sending") : t("send")}
      </Button>
    </form>
  );
}

export { Composer };
