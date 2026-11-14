"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { MessageBubble, Quote, SystemLine, type BubbleAction } from "@/components/features/Thread";
import { AttachButton, AttachmentView, VoiceRecorder } from "@/components/features/messaging/Attachments";
import { ReportSheet } from "@/components/features/ReportSheet";
import { TopBar } from "@/components/shell/TopBar";
import { Button, buttonClass, ButtonLink, IconButton } from "@/components/ui/Button";
import { ConfirmSheet, Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, DaySeparator } from "@/components/ui/Display";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/api";
import { ATTACHMENT_MAX_BYTES, GROUP_PHOTO_SIZE } from "@/lib/attachments";
import { initials } from "@/lib/format";
import { squareImage } from "@/lib/image-resize";
import { mentionQuery } from "@/lib/mentions";
import type { ChatMessage, ChatQuote, Contact, ConversationDetail } from "@/lib/messaging-types";
import { useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX, GROUP_THEMES, MESSAGE_MAX_LENGTH } from "@/lib/schemas";
import { localizeGroupName } from "@/lib/system-text";
import { useChatTime } from "../useChatTime";

/** `refused` : le serveur a refusé le message (403, blocage) ; le réessayer échouerait toujours. */
type Shown = ChatMessage & { status?: "sending" | "failed"; refused?: boolean };

const ACCENTS = ["brand", "accent"] as const;

/** Where a linked group leads: the test listing, the team, the hackathon or the Rise-Up project it follows. */
function linkedHref(linked: NonNullable<ConversationDetail["linked"]>) {
  if (linked.kind === "test") return `/tests/${linked.id}`;
  if (linked.kind === "team") return `/hackathons/${linked.id}/equipe`;
  if (linked.kind === "instructors") return `/hackathons/${linked.id}`;
  return `/rise-up/${linked.id}`;
}

/** A message quoted above a reply, as the server quotes it (src/server/messaging.ts). */
function toQuote(m: ChatMessage): ChatQuote {
  const kind = m.attachment?.kind ?? "TEXT";
  return { id: m.id, authorId: m.authorId, authorName: m.authorName, body: (m.body || (kind === "FILE" ? (m.attachment?.name ?? "") : "")).slice(0, 140), kind, hidden: Boolean(m.hidden) };
}

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
  const locale = useLocale();
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
  // The message being answered, quoted above the composer.
  const [replyTo, setReplyTo] = useState<Shown | null>(null);
  // Where the cursor stands in the draft: an @ just before it opens the list of members to mention.
  const [cursor, setCursor] = useState(0);
  const [pinError, setPinError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  // Les fichiers partent l'un après l'autre : deux envois rapprochés gardent leur ordre.
  const uploads = useRef<Promise<void>>(Promise.resolve());
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

  async function deliver(body: string, clientId: string, replyToId?: string) {
    try {
      const saved = await api<ChatMessage>(`/api/conversations/${detail.id}/messages`, { body: { body, clientId, ...(replyToId ? { replyToId } : {}) } });
      setMessages((cur) => merge(cur, [saved]));
    } catch (e) {
      // Un 403 vient d'un blocage : pas de « Réessayer », et la conversation se recharge pour fermer le champ.
      const refused = e instanceof ApiError && e.status === 403;
      setMessages((cur) => cur.map((m) => (m.clientId === clientId ? { ...m, status: "failed", refused } : m)));
      if (e instanceof ApiError && e.status !== 0) setError(e.message);
      if (refused) reload();
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
    const quote = replyTo ? toQuote(replyTo) : null;
    setMessages((cur) => [...cur, { id: `tmp-${clientId}`, clientId, authorId: me.id, authorName: me.name, body, system: false, createdAt: new Date().toISOString(), status: "sending", replyTo: quote }]);
    setDraft("");
    setReplyTo(null);
    deliver(body, clientId, quote?.id);
  }

  /** Sends a file or a voice note, shown at once as "sending", like a text message. */
  function upload(file: File, kind: "FILE" | "VOICE", seconds?: number) {
    // Un fichier trop lourd est refusé avant l'envoi : inutile de le faire monter en 4G pour rien.
    if (file.size > ATTACHMENT_MAX_BYTES) return setError(t("fileTooBig"));
    setError(null);
    const clientId = crypto.randomUUID();
    stickToBottom.current = true;
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("clientId", clientId);
    if (seconds) form.set("seconds", String(seconds));
    if (replyTo) form.set("replyToId", replyTo.id);
    setReplyTo(null);
    setMessages((cur) => [...cur, { id: `tmp-${clientId}`, clientId, authorId: me.id, authorName: me.name, body: kind === "VOICE" ? t("voiceSending") : file.name, system: false, createdAt: new Date().toISOString(), status: "sending" }]);
    uploads.current = uploads.current.then(async () => {
      try {
        const saved = await api<ChatMessage>(`/api/conversations/${detail.id}/attachments`, { body: form });
        setMessages((cur) => merge(cur, [saved]));
        // Un envoi réussi efface l'erreur d'un envoi précédent.
        setError(null);
      } catch (e) {
        setMessages((cur) => cur.filter((m) => m.clientId !== clientId));
        setError(e instanceof ApiError ? e.message : t("uploadFailed"));
      }
    });
  }

  function retry(m: Shown) {
    setMessages((cur) => cur.map((x) => (x.clientId === m.clientId ? { ...x, status: "sending" } : x)));
    deliver(m.body, m.clientId!, m.replyTo?.id);
  }

  /** Answer a message: it is quoted above the composer, and the cursor goes there. */
  function answer(m: Shown) {
    setReplyTo(m);
    input.current?.focus();
  }

  /** The owner pins or unpins a message; everyone sees the change through the group's line. */
  async function pin(m: Shown, pinned: boolean) {
    setPinError(null);
    try {
      await api(`/api/conversations/${detail.id}/messages/${m.id}/pin`, { method: "PUT", body: { pinned } });
      await reload();
    } catch (e) {
      setPinError(e instanceof ApiError ? e.message : t("pinFailed"));
    }
  }

  /** Brings a quoted message into view, when it is among the loaded ones. */
  function showMessage(id: string) {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("ring-2", "ring-focus");
    setTimeout(() => el.classList.remove("ring-2", "ring-focus"), 1600);
  }

  /** Puts « @Prénom » in place of the word being typed after @. */
  function mention(name: string) {
    const q = mentionQuery(draft, cursor);
    if (!q) return;
    const handle = `@${name} `;
    const next = draft.slice(0, q.start) + handle + draft.slice(cursor);
    setDraft(next);
    const at = q.start + handle.length;
    setCursor(at);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(at, at);
    });
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
  // Mentions: the group's members, highlighted in the messages; a mention of me stands out more.
  const mentions = group ? { members: detail.members.map((m) => ({ id: m.id, name: m.name })), meId: me.id } : undefined;
  const typing = group ? mentionQuery(draft, cursor) : null;
  // Two members with the same first name are mentioned by their full name.
  const firstNames = others.map((o) => o.name.split(" ")[0]);
  const handleOf = (name: string) => (firstNames.filter((f) => f === name.split(" ")[0]).length > 1 ? name : name.split(" ")[0]);
  const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const suggestions = typing ? others.filter((o) => plain(o.name).split(" ").some((part) => part.startsWith(plain(typing.query)))).slice(0, 5) : [];
  const canPin = group && detail.isOwner;
  const actionsFor = (m: Shown): BubbleAction[] =>
    m.id.startsWith("tmp-") || m.hidden
      ? []
      : [{ label: t("reply"), onClick: () => answer(m) }, ...(canPin ? [{ label: m.pinned ? t("unpin") : t("pin"), onClick: () => pin(m, !m.pinned) }] : [])];
  const quoteOf = (m: Shown, mine: boolean) => m.replyTo && <Quote quote={m.replyTo} mine={mine} onOpen={() => showMessage(m.replyTo!.id)} />;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        back="/messages"
        leading={
          group ? (
            <Avatar initials={initials(detail.title)} src={detail.photo} size="sm" square tone="neutral" />
          ) : detail.other ? (
            <Link href={`/profil/${detail.other.id}`} aria-label={t("profileOf", { name: detail.other.name })}>
              <Avatar initials={initials(detail.other.name)} src={detail.other.photo} size="sm" verified={detail.other.role === "SENIOR"} />
            </Link>
          ) : null
        }
        title={group ? localizeGroupName(detail.title, locale) : detail.title}
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
      {group && detail.pinned.length > 0 && <PinnedMessages pinned={detail.pinned} canPin={canPin} onOpen={showMessage} onUnpin={(m) => pin(m, false)} />}
      {pinError && (
        <div className="mx-auto mt-2 w-[calc(100%-28px)] max-w-[732px]">
          <Alert tone="danger" role="alert">
            {pinError}
          </Alert>
        </div>
      )}

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
                  <div id={`m-${m.id}`} className={cn("grid grid-cols-[32px_minmax(0,1fr)] items-end gap-2 rounded-[18px] transition-shadow", fresh && "kb-msg-in")}>
                    <Avatar initials={initials(m.authorName ?? "?")} src={photos.get(m.authorId ?? "")} size="sm" />
                    <MessageBubble
                      text={m.body}
                      hidden={m.hidden}
                      attachment={m.attachment && <AttachmentView attachment={m.attachment} />}
                      quote={quoteOf(m, false)}
                      time={time.clock(m.createdAt)}
                      author={test && m.authorId === test.ownerId ? t("appAuthor", { name: m.authorName ?? t("member") }) : (m.authorName ?? t("member"))}
                      authorTone={tone(m.authorId)}
                      actions={actionsFor(m)}
                      mentions={mentions}
                      pinned={m.pinned}
                      onReport={() => setReportMessage(m.id)}
                    />
                  </div>
                ) : (
                  <div id={`m-${m.id}`} className={cn("grid rounded-[18px] transition-shadow", mine ? "justify-items-end" : "justify-items-start", fresh && "kb-msg-in")} data-mine={mine || undefined}>
                    <MessageBubble
                      text={m.body}
                      hidden={m.hidden}
                      attachment={m.attachment && <AttachmentView attachment={m.attachment} mine={mine} />}
                      quote={quoteOf(m, mine)}
                      time={time.clock(m.createdAt)}
                      mine={mine}
                      status={m.status}
                      onRetry={m.refused ? undefined : () => retry(m)}
                      actions={actionsFor(m)}
                      mentions={mentions}
                      pinned={m.pinned}
                      onReport={mine ? undefined : () => setReportMessage(m.id)}
                    />
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
          {replyTo && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="grid min-w-0 gap-0.5">
                <span className="text-xs font-extrabold text-brand-text">{t("replyingTo", { name: replyTo.authorId === me.id ? t("you") : (replyTo.authorName ?? t("member")) })}</span>
                <Quote quote={toQuote(replyTo)} onOpen={() => showMessage(replyTo.id)} />
              </div>
              <IconButton icon="close" label={t("cancelReply")} onClick={() => setReplyTo(null)} />
            </div>
          )}
          {suggestions.length > 0 && (
            <ul role="listbox" aria-label={t("mentionList")} className="m-0 grid list-none gap-0.5 rounded-lg border-2 border-line-strong bg-raised p-1">
              {suggestions.map((o) => (
                <li key={o.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => mention(handleOf(o.name))} className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-bold hover:bg-bg">
                    <Avatar initials={initials(o.name)} src={o.photo} size="sm" />
                    {o.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-1">
            <AttachButton disabled={blocked && !group} onPick={(f) => upload(f, "FILE")} label={test ? t("attachCapture") : undefined} icon={test ? "image" : undefined} />
            <textarea
              ref={input}
              rows={Math.min(5, Math.max(1, draft.split("\n").length))}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setCursor(e.target.selectionStart ?? e.target.value.length);
              }}
              onSelect={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
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

/** The messages pinned by the group's owner, the last pinned first. A tap brings one into view. */
function PinnedMessages({ pinned, canPin, onOpen, onUnpin }: { pinned: ChatMessage[]; canPin: boolean; onOpen: (id: string) => void; onUnpin: (m: ChatMessage) => void }) {
  const t = useTranslations("messaging.conversation");
  const tb = useTranslations("messaging.bubble");
  const [open, setOpen] = useState(false);
  const shown = open ? pinned : pinned.slice(0, 1);
  return (
    <section aria-label={t("pinnedMessages")} className="mx-auto mt-3 grid w-[calc(100%-28px)] max-w-[732px] gap-1.5 rounded-lg border-2 border-line-strong bg-raised px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-muted uppercase">
          <Icon name="flag" size={16} />
          {t("pinnedCount", { count: pinned.length })}
        </span>
        {pinned.length > 1 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-9 text-xs font-extrabold text-brand-text">
            {open ? t("pinnedLess") : t("pinnedAll")}
          </button>
        )}
      </div>
      {shown.map((m) => (
        <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <button type="button" onClick={() => onOpen(m.id)} className="grid min-w-0 text-left">
            <span className="truncate text-xs font-extrabold">{m.authorName ?? tb("member")}</span>
            <span className="line-clamp-2 text-sm">{m.body || (m.attachment?.kind === "VOICE" ? tb("voice") : (m.attachment?.name ?? tb("file")))}</span>
          </button>
          {canPin && (
            <button type="button" onClick={() => onUnpin(m)} className="min-h-9 px-1 text-xs font-bold text-muted underline-offset-2 hover:underline">
              {t("unpin")}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

/** Screen T4: the tasks of the test, pinned. A tester ticks them here; the author reads them. */
function PinnedTasks({ test }: { test: NonNullable<ConversationDetail["test"]> }) {
  const t = useTranslations("messaging.conversation");
  const [done, setDone] = useState<number[]>(test.doneSteps ?? []);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(false);
  const tester = test.doneSteps !== null;
  // Ticks sent in a row: the list from the server is applied only once the last one has answered,
  // otherwise an older answer would erase the ticks made since.
  const pending = useRef(0);

  async function toggle(index: number, next: boolean) {
    const apply = (d: number[], on: boolean) => (on ? [...new Set([...d, index])] : d.filter((i) => i !== index));
    setError(false);
    setDone((d) => apply(d, next));
    pending.current += 1;
    try {
      const r = await api<{ doneSteps: number[] }>(`/api/tests/${test.id}/steps`, { method: "PUT", body: { index, done: next } });
      if (pending.current === 1) setDone(r.doneSteps);
    } catch {
      setDone((d) => apply(d, !next));
      setError(true);
    } finally {
      pending.current -= 1;
    }
  }

  return (
    <section aria-label={t("pinnedLabel")} className="mx-auto mt-3 grid w-[calc(100%-28px)] max-w-[732px] gap-2 rounded-lg border-2 border-line-strong bg-raised px-3.5 py-3">
      <div className="flex items-center justify-between gap-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 items-center gap-1.5 text-xs font-extrabold tracking-wide text-muted uppercase">
          {t("pinned")}
          {tester && <span className="tabular">· {done.length}/{test.steps.length}</span>}
          <Icon name="chevron" size={16} className={open ? "-rotate-90" : "rotate-90"} />
        </button>
        {/* A plain <a>: the app lives outside KABAD. */}
        <a href={test.url} target="_blank" rel="noreferrer" className={buttonClass({ variant: "ink", size: "sm", className: "h-11 px-3 text-[13px] no-underline" })}>
          {t("installApp")}
        </a>
      </div>
      {open &&
        test.steps.map((step, i) =>
          tester ? (
            <label key={i} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-bold">
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
  const locale = useLocale();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editing, setEditing] = useState(false);
  // Removing a member asks for a confirmation first: they lose the group at once.
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The owner changes the name, theme, description and photo of any group, linked ones included (P19).
  const editable = detail.isOwner;
  // Members are removed from a private group, or from a testers' group (they leave the test too).
  const canRemove = detail.isOwner && (!detail.linked || detail.linked.kind === "test");

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
            <ButtonLink href={linkedHref(detail.linked)} variant="secondary" size="lg" block>
              {detail.linked.kind === "test" ? t("openTest") : detail.linked.kind === "team" ? t("openTeam") : detail.linked.kind === "instructors" ? t("openHackathon") : t("openProject")}
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
            <b className="font-display text-lg leading-6 break-words">{localizeGroupName(detail.title, locale)}</b>
            <span className="text-sm text-muted">{[tc("memberCount", { count: detail.members.length }), detail.theme].filter(Boolean).join(" · ")}</span>
          </span>
          {editable && !editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {t("edit")}
            </Button>
          )}
        </div>
        {detail.description && !editing && <p className="text-[15px] leading-[22px] whitespace-pre-line">{detail.description}</p>}
        {editable && editing && <GroupEditor detail={detail} onDone={() => setEditing(false)} onChanged={onChanged} />}
        {detail.linked && (
          <Alert tone="info">
            {detail.linked.kind === "test" ? (detail.isOwner ? t("linkedTestOwner") : t("linkedTest")) : detail.linked.kind === "team" ? t("linkedTeam") : detail.linked.kind === "instructors" ? t("linkedInstructors") : t("linkedProject")}
          </Alert>
        )}
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
              <Avatar initials={initials(m.name)} src={m.photo} size="sm" verified={m.mentor} />
              <span className="grid">
                <Link href={`/profil/${m.id}`} className="text-sm font-bold text-ink no-underline">
                  {m.id === meId ? tc("you") : m.name}
                </Link>
                {m.owner && <span className="text-xs text-muted">{t("owner")}</span>}
              </span>
              {canRemove && m.id !== meId ? (
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
          text={detail.linked?.kind === "test" ? t("removeTesterText", { name: (removing?.name ?? "").split(" ")[0] }) : t("removeText", { name: (removing?.name ?? "").split(" ")[0] })}
          confirm={t("remove")}
        />
    </>
  );
}

/**
 * The owner renames the group, changes its theme, its description and its photo. The photo is cropped and reduced
 * before it is sent. A linked group keeps the theme of its source (« Test », « Rise-Up »…).
 */
function GroupEditor({ detail, onDone, onChanged }: { detail: ConversationDetail; onDone: () => void; onChanged: () => void }) {
  const t = useTranslations("messaging.people");
  const tg = useTranslations("messaging.group");
  const [name, setName] = useState(detail.title);
  const [theme, setTheme] = useState(detail.theme ?? "");
  const [description, setDescription] = useState(detail.description ?? "");
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
    run("save", () => api(`/api/groups/${detail.id}`, { method: "PATCH", body: { name, description: description.trim() || null, ...(detail.linked ? {} : { theme: theme || null }) } }), onDone);
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
      <TextArea
        id="group-description"
        label={tg("description")}
        hint={tg("descriptionHint")}
        rows={3}
        maxLength={GROUP_DESCRIPTION_MAX}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        counter={`${description.length} / ${GROUP_DESCRIPTION_MAX}`}
        error={error?.field === "description" ? error.text : undefined}
      />
      {!detail.linked && (
        <Select id="group-theme" label={tg("theme")} value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">{t("noTheme")}</option>
          {GROUP_THEMES.map((g, i) => (
            <option key={g} value={g}>
              {tg(`themes.t${i}` as "themes.t0")}
            </option>
          ))}
        </Select>
      )}
      {error && !["photo", "name", "description"].includes(error.field ?? "") && (
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
