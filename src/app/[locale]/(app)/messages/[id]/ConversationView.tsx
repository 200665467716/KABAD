"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { MessageBubble, SystemLine } from "@/components/features/Thread";
import { AttachButton, AttachmentView, VoiceRecorder } from "@/components/features/messaging/Attachments";
import { ReportSheet } from "@/components/features/ReportSheet";
import { TopBar } from "@/components/shell/TopBar";
import { Button, buttonClass, ButtonLink, IconButton } from "@/components/ui/Button";
import { ConfirmSheet, Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, DaySeparator } from "@/components/ui/Display";
import { Select, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/api";
import { GROUP_PHOTO_SIZE } from "@/lib/attachments";
import { initials } from "@/lib/format";
import { squareImage } from "@/lib/image-resize";
import type { ChatMessage, Contact, ConversationDetail } from "@/lib/messaging-types";
import { useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { GROUP_NAME_MAX, GROUP_THEMES, MESSAGE_MAX_LENGTH } from "@/lib/schemas";
import { useChatTime } from "../useChatTime";

type Shown = ChatMessage & { status?: "sending" | "failed" };

const ACCENTS = ["brand", "accent"] as const;

function merge(current: Shown[], incoming: ChatMessage[]): Shown[] {
  const out = [...current];
  for (const m of incoming) {
    const i = out.findIndex((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId));
    if (i >= 0) out[i] = m;
    else out.push(m);
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function ConversationView({ me, initial }: { me: { id: string; name: string }; initial: ConversationDetail }) {
  const t = useTranslations("messaging.conversation");
  const tp = useTranslations("tests.platform");
  const time = useChatTime();
  const [detail, setDetail] = useState(initial);
  const [messages, setMessages] = useState<Shown[]>(initial.messages);
  // Messages already on screen when the page opened, or loaded from the history: they do not animate.
  // Only a message that arrives while the member reads (sent or received) slides in.
  const [settled] = useState(() => new Set(initial.messages.map((m) => m.clientId ?? m.id)));
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blockedNow, setBlocked] = useState(false);
  const [report, setReport] = useState(false);
  const [adding, setAdding] = useState(false);
  const [people, setPeople] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const router = useRouter();
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const group = detail.kind === "GROUP";
  // T4: in a testers' group, the tasks stay pinned above the messages.
  const test = detail.test;
  // The group of an app to test or of a Rise-Up project changes only from there.
  const manageable = group && detail.isOwner && !detail.linked;

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") api(`/api/conversations/${detail.id}/read`, { method: "POST" }).catch(() => {});
  }, [detail.id]);

  useEffect(() => {
    markRead();
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // Keep the newest message in view, unless the member scrolled up or older messages were just added on top.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useRealtime("message:new", ({ conversationId, message }) => {
    if (conversationId !== detail.id) return;
    setMessages((cur) => merge(cur, [message]));
    if (message.authorId !== me.id) markRead();
  });

  const reload = useCallback(async () => {
    try {
      const fresh = await api<ConversationDetail>(`/api/conversations/${detail.id}`);
      setDetail(fresh);
      setMessages((cur) => merge(cur, fresh.messages));
    } catch (e) {
      // Removed from the group, or the group was deleted: back to the inbox.
      if (e instanceof ApiError && e.status === 404) router.replace("/messages");
      // Otherwise a later event or reconnection retries.
    }
  }, [detail.id, router]);

  useRealtime("conversation:changed", ({ conversationId }) => {
    if (conversationId === detail.id) reload();
  });
  useRealtimeReconnect(reload);
  // Catch up on messages sent between the server render and the subscription above.
  useEffect(() => {
    let alive = true;
    api<ConversationDetail>(`/api/conversations/${detail.id}`)
      .then((fresh) => alive && setMessages((cur) => merge(cur, fresh.messages)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [detail.id]);

  async function deliver(body: string, clientId: string) {
    try {
      const saved = await api<ChatMessage>(`/api/conversations/${detail.id}/messages`, { body: { body, clientId } });
      setMessages((cur) => merge(cur, [saved]));
    } catch (e) {
      setMessages((cur) => cur.map((m) => (m.clientId === clientId ? { ...m, status: "failed" } : m)));
      if (e instanceof ApiError && e.status !== 0) setError(e.message);
    }
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (Array.from(body).length > MESSAGE_MAX_LENGTH) return setError(t("tooLong", { max: MESSAGE_MAX_LENGTH }));
    setError(null);
    const clientId = crypto.randomUUID();
    stickToBottom.current = true;
    setMessages((cur) => [...cur, { id: `tmp-${clientId}`, clientId, authorId: me.id, authorName: me.name, body, system: false, createdAt: new Date().toISOString(), status: "sending" }]);
    setDraft("");
    deliver(body, clientId);
  }

  /** Sends a file or a voice note, shown at once as "sending", like a text message. */
  async function upload(file: File, kind: "FILE" | "VOICE", seconds?: number) {
    setError(null);
    const clientId = crypto.randomUUID();
    stickToBottom.current = true;
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("clientId", clientId);
    if (seconds) form.set("seconds", String(seconds));
    setMessages((cur) => [...cur, { id: `tmp-${clientId}`, clientId, authorId: me.id, authorName: me.name, body: kind === "VOICE" ? t("voiceSending") : file.name, system: false, createdAt: new Date().toISOString(), status: "sending" }]);
    try {
      const saved = await api<ChatMessage>(`/api/conversations/${detail.id}/attachments`, { body: form });
      setMessages((cur) => merge(cur, [saved]));
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.clientId !== clientId));
      setError(e instanceof ApiError ? e.message : t("uploadFailed"));
    }
  }

  function retry(m: Shown) {
    setMessages((cur) => cur.map((x) => (x.clientId === m.clientId ? { ...x, status: "sending" } : x)));
    deliver(m.body, m.clientId!);
  }

  async function loadOlder() {
    const first = messages.find((m) => !m.id.startsWith("tmp-"));
    if (!first) return;
    try {
      const page = await api<ConversationDetail>(`/api/conversations/${detail.id}?avant=${encodeURIComponent(first.createdAt)}`);
      if (list.current) keepOffset.current = list.current.scrollHeight - list.current.scrollTop;
      for (const m of page.messages) settled.add(m.clientId ?? m.id);
      setMessages((cur) => merge(cur, page.messages));
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("olderError"));
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // On a phone, Enter makes a new line (code needs several); the send button sends.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touch) send(e);
  }

  const others = detail.members.filter((m) => m.id !== me.id);
  // Blocking only stops a direct conversation; in a group, the report goes to the team.
  const blocked = !group && (blockedNow || detail.blocked !== null);
  const memberNames = [t("you"), ...others.map((m) => m.name.split(" ")[0])].join(", ");
  const tone = (authorId: string | null) => ACCENTS[Math.max(0, others.findIndex((o) => o.id === authorId)) % 2];
  // MS5: each message of a group shows its author's photo (initials for a member who left).
  const photos = new Map(detail.members.map((m) => [m.id, m.photo]));
  const length = Array.from(draft).length;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        back="/messages"
        leading={
          group ? (
            <Avatar initials={initials(detail.title)} src={detail.photo} size="sm" square tone="neutral" />
          ) : detail.other ? (
            <Link href={`/profil/${detail.other.id}`} aria-label={t("profileOf", { name: detail.other.name })}>
              <Avatar initials={initials(detail.other.name)} src={detail.other.photo} size="sm" />
            </Link>
          ) : null
        }
        title={detail.title}
        subtitle={group ? `${t("memberCount", { count: detail.members.length })} · ${test ? test.platforms.map((p) => tp(p)).join(", ") : (detail.theme ?? memberNames)}` : detail.other ? `${detail.other.role === "SENIOR" ? `${t("mentor")} · ` : ""}${detail.other.city}` : undefined}
        actions={
          <>
            {manageable && <IconButton icon="userPlus" label={t("addMembers")} onClick={() => setAdding(true)} />}
            {group && <IconButton icon="users" label={t("groupInfo")} onClick={() => setPeople(true)} />}
            <IconButton icon="more" label={t("report")} onClick={() => setReport(true)} />
          </>
        }
      />

      {test && <PinnedTasks key={test.id} test={test} />}

      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        // Scrolling up to the first message must not trigger the phone's pull-to-refresh.
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <main className="mx-auto grid min-h-full w-full max-w-[760px] content-end gap-2.5 px-4 py-3 lg:px-10" aria-live="polite" aria-label={t("messages")}>
          {hasMore && (
            <Button variant="ghost" size="sm" onClick={loadOlder} className="justify-self-center">
              {t("loadOlder")}
            </Button>
          )}
          {messages.length === 0 && <p className="justify-self-center text-sm text-muted">{t("first")}</p>}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || time.day(prev.createdAt) !== time.day(m.createdAt);
            const mine = m.authorId === me.id;
            const fresh = !settled.has(m.clientId ?? m.id);
            return (
              <Fragment key={m.clientId ?? m.id}>
                {newDay && <DaySeparator>{time.day(m.createdAt)}</DaySeparator>}
                {m.system ? (
                  <SystemLine>{m.body}</SystemLine>
                ) : group && !mine ? (
                  <div className={cn("grid grid-cols-[32px_minmax(0,1fr)] items-end gap-2", fresh && "kb-msg-in")}>
                    <Avatar initials={initials(m.authorName ?? "?")} src={photos.get(m.authorId ?? "")} size="sm" />
                    <MessageBubble text={m.body} hidden={m.hidden} attachment={m.attachment && <AttachmentView attachment={m.attachment} />} time={time.clock(m.createdAt)} author={test && m.authorId === test.ownerId ? t("appAuthor", { name: m.authorName ?? t("member") }) : (m.authorName ?? t("member"))} authorTone={tone(m.authorId)} onReport={() => setReportMessage(m.id)} />
                  </div>
                ) : (
                  <div className={cn("grid", fresh && "kb-msg-in")} data-mine={mine || undefined}>
                    <MessageBubble text={m.body} hidden={m.hidden} attachment={m.attachment && <AttachmentView attachment={m.attachment} mine={mine} />} time={time.clock(m.createdAt)} mine={mine} status={m.status} onRetry={() => retry(m)} onReport={mine ? undefined : () => setReportMessage(m.id)} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </main>
      </div>

      <form onSubmit={send} className="sticky bottom-0 border-t-2 border-line-strong bg-raised">
        <div className="mx-auto grid max-w-[760px] gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom,0px))] lg:px-10">
          {(error || blocked) && (
            <Alert tone={blocked ? "info" : "danger"} role="alert">
              {blocked ? (detail.blocked === "by_them" ? t("blockedByThem") : t("blockedByMe")) : error}
            </Alert>
          )}
          <div className="flex items-end gap-1">
            <AttachButton disabled={blocked && !group} onPick={(f) => upload(f, "FILE")} label={test ? t("attachCapture") : undefined} icon={test ? "image" : undefined} />
            <textarea
              rows={Math.min(5, Math.max(1, draft.split("\n").length))}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              maxLength={MESSAGE_MAX_LENGTH}
              disabled={blocked && !group}
              aria-label={test ? t("placeholderTest") : group ? t("placeholderGroup") : t("placeholder")}
              placeholder={test ? t("placeholderTest") : group ? t("placeholderGroup") : t("placeholder")}
              className="min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border-2 border-line-strong bg-bg px-4 py-2 text-base leading-[22px]"
            />
            {draft.trim() ? (
              <Button type="submit" iconOnly icon="send" aria-label={t("send")} className="rounded-full" disabled={blocked && !group} />
            ) : (
              <VoiceRecorder disabled={blocked && !group} onRecorded={(f, s) => upload(f, "VOICE", s)} onError={setError} />
            )}
          </div>
          {length > MESSAGE_MAX_LENGTH - 500 && (
            <span className="justify-self-end text-xs text-subtle tabular">
              {length} / {MESSAGE_MAX_LENGTH}
            </span>
          )}
        </div>
      </form>

      <ReportSheet open={report} onClose={() => setReport(false)} subject={t("subjectConversation")} target={{ type: "CONVERSATION", id: detail.id }} onBlocked={() => !group && setBlocked(true)} />
      <ReportSheet open={reportMessage !== null} onClose={() => setReportMessage(null)} subject={t("subjectMessage")} target={{ type: "MESSAGE", id: reportMessage ?? "" }} onBlocked={() => !group && setBlocked(true)} />
      {group && <MembersSheet open={people} onClose={() => setPeople(false)} detail={detail} meId={me.id} onChanged={reload} onLeft={() => router.replace("/messages")} />}
      {manageable && <AddMembersSheet open={adding} onClose={() => setAdding(false)} conversationId={detail.id} memberIds={detail.members.map((m) => m.id)} onAdded={reload} />}
    </div>
  );
}

/** Screen T4: the tasks of the test, pinned. A tester ticks them here; the author reads them. */
function PinnedTasks({ test }: { test: NonNullable<ConversationDetail["test"]> }) {
  const t = useTranslations("messaging.conversation");
  const [done, setDone] = useState<number[]>(test.doneSteps ?? []);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(false);
  const tester = test.doneSteps !== null;

  async function toggle(index: number, next: boolean) {
    const before = done;
    setError(false);
    setDone(next ? [...done, index] : done.filter((i) => i !== index));
    try {
      const r = await api<{ doneSteps: number[] }>(`/api/tests/${test.id}/steps`, { method: "PUT", body: { index, done: next } });
      setDone(r.doneSteps);
    } catch {
      setDone(before);
      setError(true);
    }
  }

  return (
    <section aria-label={t("pinnedLabel")} className="mx-auto mt-3 grid w-[calc(100%-28px)] max-w-[732px] gap-2 rounded-lg border-2 border-line-strong bg-raised px-3.5 py-3">
      <div className="flex items-center justify-between gap-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-9 items-center gap-1.5 text-xs font-extrabold tracking-wide text-muted uppercase">
          {t("pinned")}
          {tester && <span className="tabular">· {done.length}/{test.steps.length}</span>}
          <Icon name="chevron" size={16} className={open ? "-rotate-90" : "rotate-90"} />
        </button>
        {/* A plain <a>: the app lives outside KABAD. */}
        <a href={test.url} target="_blank" rel="noreferrer" className={buttonClass({ variant: "ink", size: "sm", className: "h-9 px-3 text-[13px] no-underline" })}>
          {t("installApp")}
        </a>
      </div>
      {open &&
        test.steps.map((step, i) =>
          tester ? (
            <label key={i} className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm font-bold">
              <input type="checkbox" checked={done.includes(i)} onChange={(e) => toggle(i, e.target.checked)} className="size-5 shrink-0 accent-[var(--brand)]" />
              <span className={done.includes(i) ? "text-muted line-through" : undefined}>{step}</span>
            </label>
          ) : (
            <p key={i} className="flex min-h-8 items-center gap-2.5 text-sm font-bold">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] text-raised">{i + 1}</span>
              {step}
            </p>
          ),
        )}
      {error && <p className="text-[13px] font-bold text-danger">{t("taskError")}</p>}
    </section>
  );
}

function AddMembersSheet({ open, onClose, conversationId, memberIds, onAdded }: { open: boolean; onClose: () => void; conversationId: string; memberIds: string[]; onAdded: () => void }) {
  const t = useTranslations("messaging.add");
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<{ contacts: Contact[] }>("/api/contacts")
      .then((d) => alive && setContacts(d.contacts))
      .catch(() => alive && setError(t("loadError")));
    return () => {
      alive = false;
    };
  }, [open, t]);

  const available = (contacts ?? []).filter((c) => !memberIds.includes(c.id));

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/groups/${conversationId}/members`, { body: { memberIds: chosen } });
      setChosen([]);
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={
        <Button size="lg" block onClick={add} disabled={chosen.length === 0 || busy}>
          {busy ? t("adding") : chosen.length > 1 ? t("addMany", { count: chosen.length }) : t("addOne")}
        </Button>
      }
    >
      <p className="text-sm text-muted">{t("help")}</p>
      {contacts === null && !error && <p className="text-sm text-muted">{t("loading")}</p>}
      {contacts !== null && available.length === 0 && <p className="text-sm text-muted">{t("allIn")}</p>}
      {available.length > 0 && (
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {available.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <li key={c.id}>
                <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                  <Avatar initials={initials(c.name)} src={c.photo} size="sm" />
                  <span className="grid">
                    <span className="text-sm font-bold">{c.name}</span>
                    <span className="text-xs text-muted">{c.city}</span>
                  </span>
                  <input type="checkbox" checked={on} onChange={() => setChosen((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} className="size-5.5 accent-[var(--brand)]" aria-label={t("addLabel", { name: c.name })} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Sheet>
  );
}

function MembersSheet({ open, onClose, detail, meId, onChanged, onLeft }: { open: boolean; onClose: () => void; detail: ConversationDetail; meId: string; onChanged: () => void; onLeft: () => void }) {
  const t = useTranslations("messaging.people");
  const tc = useTranslations("messaging.conversation");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editing, setEditing] = useState(false);
  // Removing a member asks for a confirmation first: they lose the group at once.
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only the owner of a private group changes its name, theme and photo.
  const editable = detail.isOwner && !detail.linked;

  async function run(key: string, call: () => Promise<unknown>, after: () => void) {
    setBusy(key);
    setError(null);
    try {
      await call();
      after();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={t("infoTitle")}
        footer={
          detail.linked ? (
            <ButtonLink href={detail.linked.kind === "test" ? `/tests/${detail.linked.id}` : detail.linked.kind === "team" ? `/hackathons/${detail.linked.id}/equipe` : `/rise-up/${detail.linked.id}`} variant="secondary" size="lg" block>
              {detail.linked.kind === "test" ? t("openTest") : detail.linked.kind === "team" ? t("openTeam") : t("openProject")}
            </ButtonLink>
          ) : confirmLeave ? (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
                {t("cancel")}
              </Button>
              <Button variant="danger" disabled={busy !== null} onClick={() => run("leave", () => api(`/api/groups/${detail.id}/leave`, { method: "POST" }), onLeft)}>
                {busy === "leave" ? t("leaving") : t("confirm")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="lg" block onClick={() => setConfirmLeave(true)}>
              {t("leave")}
            </Button>
          )
        }
      >
        {/* MS5: the photo, the name of the group and, under it, its theme. */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Avatar initials={initials(detail.title)} src={detail.photo} size="lg" square tone="neutral" />
          <span className="grid min-w-0">
            <b className="font-display text-lg leading-6 break-words">{detail.title}</b>
            <span className="text-sm text-muted">{[tc("memberCount", { count: detail.members.length }), detail.theme].filter(Boolean).join(" · ")}</span>
          </span>
          {editable && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {t("edit")}
            </Button>
          )}
        </div>
        {editable && editing && <GroupEditor detail={detail} onDone={() => setEditing(false)} onChanged={onChanged} />}
        {detail.linked && <Alert tone="info">{detail.linked.kind === "test" ? t("linkedTest") : detail.linked.kind === "team" ? t("linkedTeam") : t("linkedProject")}</Alert>}
        <h3 className="text-sm font-extrabold">{t("title", { count: detail.members.length })}</h3>
        {confirmLeave && (
          <Alert tone="info">
            {t("leaveInfo")}
            {detail.isOwner ? ` ${t("leaveOwner")}` : ""}
          </Alert>
        )}
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {detail.members.map((m) => (
            <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
              <Avatar initials={initials(m.name)} src={m.photo} size="sm" />
              <span className="grid">
                <Link href={`/profil/${m.id}`} className="text-sm font-bold text-ink no-underline">
                  {m.id === meId ? tc("you") : m.name}
                </Link>
                {m.owner && <span className="text-xs text-muted">{t("owner")}</span>}
              </span>
              {detail.isOwner && !detail.linked && m.id !== meId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  aria-label={t("removeLabel", { name: m.name })}
                  onClick={() => setRemoving({ id: m.id, name: m.name })}
                >
                  {busy === m.id ? "…" : t("remove")}
                </Button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </Sheet>
        <ConfirmSheet
          open={removing !== null}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const m = removing;
            if (!m) return;
            setRemoving(null);
            run(m.id, () => api(`/api/groups/${detail.id}/members/${m.id}`, { method: "DELETE" }), onChanged);
          }}
          title={t("removeTitle", { name: (removing?.name ?? "").split(" ")[0] })}
          text={t("removeText", { name: (removing?.name ?? "").split(" ")[0] })}
          confirm={t("remove")}
        />
    </>
  );
}

/** The owner renames the group, changes its theme and its photo. The photo is cropped and reduced before it is sent. */
function GroupEditor({ detail, onDone, onChanged }: { detail: ConversationDetail; onDone: () => void; onChanged: () => void }) {
  const t = useTranslations("messaging.people");
  const tg = useTranslations("messaging.group");
  const [name, setName] = useState(detail.title);
  const [theme, setTheme] = useState(detail.theme ?? "");
  const [busy, setBusy] = useState<"save" | "photo" | null>(null);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(key: "save" | "photo", call: () => Promise<unknown>, after?: () => void) {
    setBusy(key);
    setError(null);
    try {
      await call();
      onChanged();
      after?.();
    } catch (e) {
      setError({ field: e instanceof ApiError ? e.field : undefined, text: e instanceof ApiError ? e.message : t("failed") });
    } finally {
      setBusy(null);
    }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    run("save", () => api(`/api/groups/${detail.id}`, { method: "PATCH", body: { name, theme: theme || null } }), onDone);
  }

  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    run("photo", async () => {
      const form = new FormData();
      form.append("photo", await squareImage(chosen, GROUP_PHOTO_SIZE).catch(() => chosen), "photo");
      await api(`/api/groups/${detail.id}/photo`, { method: "PUT", body: form });
    });
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-3 rounded-lg border-2 border-line-strong p-3.5">
      <div className="flex flex-wrap gap-2">
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickPhoto} />
        <Button variant="secondary" size="sm" icon="image" disabled={busy !== null} onClick={() => file.current?.click()}>
          {busy === "photo" ? t("photoSending") : detail.photo ? t("photoChange") : t("photoAdd")}
        </Button>
        {detail.photo && (
          <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("photo", () => api(`/api/groups/${detail.id}/photo`, { method: "DELETE" }))}>
            {t("photoRemove")}
          </Button>
        )}
      </div>
      {error?.field === "photo" && <p className="text-sm font-extrabold text-danger">{error.text}</p>}
      <TextField id="group-name" label={tg("name")} value={name} maxLength={GROUP_NAME_MAX} onChange={(e) => setName(e.target.value)} error={error?.field === "name" ? error.text : undefined} />
      <Select id="group-theme" label={tg("theme")} value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="">{t("noTheme")}</option>
        {GROUP_THEMES.map((g, i) => (
          <option key={g} value={g}>
            {tg(`themes.t${i}` as "themes.t0")}
          </option>
        ))}
      </Select>
      {error && !["photo", "name"].includes(error.field ?? "") && (
        <Alert tone="danger" role="alert">
          {error.text}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onDone} disabled={busy !== null}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="ink" disabled={busy !== null || !name.trim()}>
          {busy === "save" ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
