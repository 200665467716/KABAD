"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MessageBubble, SystemLine } from "@/components/features/Thread";
import { ReportSheet } from "@/components/features/ReportSheet";
import { TopBar } from "@/components/shell/TopBar";
import { Button, IconButton } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, DaySeparator } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ChatMessage, Contact, ConversationDetail } from "@/lib/messaging-types";
import { useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { MESSAGE_MAX_LENGTH } from "@/lib/schemas";
import { clockTime, dayLabel } from "@/lib/time";

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
  const [detail, setDetail] = useState(initial);
  const [messages, setMessages] = useState<Shown[]>(initial.messages);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [report, setReport] = useState(false);
  const [adding, setAdding] = useState(false);
  const [people, setPeople] = useState(false);
  const router = useRouter();
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const group = detail.kind === "GROUP";

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
    if (Array.from(body).length > MESSAGE_MAX_LENGTH) return setError(`Un message fait ${MESSAGE_MAX_LENGTH} caractères au plus.`);
    setError(null);
    const clientId = crypto.randomUUID();
    stickToBottom.current = true;
    setMessages((cur) => [...cur, { id: `tmp-${clientId}`, clientId, authorId: me.id, authorName: me.name, body, system: false, createdAt: new Date().toISOString(), status: "sending" }]);
    setDraft("");
    deliver(body, clientId);
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
      setMessages((cur) => merge(cur, page.messages));
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger les messages précédents.");
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
  }

  const others = detail.members.filter((m) => m.id !== me.id);
  const memberNames = ["Vous", ...others.map((m) => m.name.split(" ")[0])].join(", ");
  const tone = (authorId: string | null) => ACCENTS[Math.max(0, others.findIndex((o) => o.id === authorId)) % 2];
  const length = Array.from(draft).length;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        back="/messages"
        leading={
          group ? (
            <Avatar initials={initials(detail.title)} size="sm" square tone="neutral" />
          ) : detail.other ? (
            <Link href={`/profil/${detail.other.id}`} aria-label={`Profil de ${detail.other.name}`}>
              <Avatar initials={initials(detail.other.name)} size="sm" />
            </Link>
          ) : null
        }
        title={<span className="text-lg lg:text-2xl">{detail.title}</span>}
        subtitle={group ? memberNames : detail.other ? `${detail.other.role === "SENIOR" ? "Senior · " : ""}${detail.other.city}` : undefined}
        actions={
          <>
            {group && detail.isOwner && <IconButton icon="userPlus" label="Ajouter des participants" onClick={() => setAdding(true)} />}
            {group && <IconButton icon="users" label="Participants" onClick={() => setPeople(true)} />}
            <IconButton icon="more" label="Signaler la conversation" onClick={() => setReport(true)} />
          </>
        }
      />

      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        // Scrolling up to the first message must not trigger the phone's pull-to-refresh.
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <main className="mx-auto grid min-h-full w-full max-w-[760px] content-end gap-2.5 px-4 py-3 lg:px-10" aria-live="polite" aria-label="Messages">
          {hasMore && (
            <Button variant="ghost" size="sm" onClick={loadOlder} className="justify-self-center">
              Charger les messages précédents
            </Button>
          )}
          {messages.length === 0 && <p className="justify-self-center text-sm text-muted">Écrivez le premier message.</p>}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const mine = m.authorId === me.id;
            return (
              <Fragment key={m.clientId ?? m.id}>
                {newDay && <DaySeparator>{dayLabel(m.createdAt)}</DaySeparator>}
                {m.system ? (
                  <SystemLine>{m.body}</SystemLine>
                ) : group && !mine ? (
                  <div className="grid grid-cols-[32px_minmax(0,1fr)] items-end gap-2">
                    <Avatar initials={initials(m.authorName ?? "?")} size="sm" />
                    <MessageBubble text={m.body} time={clockTime(m.createdAt)} author={m.authorName ?? "Membre"} authorTone={tone(m.authorId)} />
                  </div>
                ) : (
                  <MessageBubble text={m.body} time={clockTime(m.createdAt)} mine={mine} status={m.status} onRetry={() => retry(m)} />
                )}
              </Fragment>
            );
          })}
        </main>
      </div>

      <form onSubmit={send} className="sticky bottom-0 border-t border-line bg-raised">
        <div className="mx-auto grid max-w-[760px] gap-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom,0px))] lg:px-10">
          {(error || blocked) && (
            <Alert tone={blocked ? "info" : "danger"} role="alert">
              {blocked ? "Vous avez bloqué ce membre. Il ne peut plus vous écrire." : error}
            </Alert>
          )}
          <div className="flex items-end gap-2">
            <textarea
              rows={Math.min(5, Math.max(1, draft.split("\n").length))}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              maxLength={MESSAGE_MAX_LENGTH}
              disabled={blocked && !group}
              aria-label={group ? "Message au groupe" : "Votre message"}
              placeholder={group ? "Message au groupe" : "Votre message"}
              className="min-h-11 min-w-0 flex-1 resize-none rounded-[22px] border border-line-strong bg-bg px-4 py-2.5 text-base leading-6"
            />
            <Button type="submit" iconOnly icon="send" aria-label="Envoyer" className="rounded-full" disabled={!draft.trim() || (blocked && !group)} />
          </div>
          {length > MESSAGE_MAX_LENGTH - 500 && (
            <span className="justify-self-end text-xs text-subtle tabular">
              {length} / {MESSAGE_MAX_LENGTH}
            </span>
          )}
        </div>
      </form>

      <ReportSheet open={report} onClose={() => setReport(false)} subject="cette conversation" target={{ type: "CONVERSATION", id: detail.id }} onBlocked={() => setBlocked(true)} />
      {group && <MembersSheet open={people} onClose={() => setPeople(false)} detail={detail} meId={me.id} onChanged={reload} onLeft={() => router.replace("/messages")} />}
      {group && detail.isOwner && <AddMembersSheet open={adding} onClose={() => setAdding(false)} conversationId={detail.id} memberIds={detail.members.map((m) => m.id)} onAdded={reload} />}
    </div>
  );
}

function AddMembersSheet({ open, onClose, conversationId, memberIds, onAdded }: { open: boolean; onClose: () => void; conversationId: string; memberIds: string[]; onAdded: () => void }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<{ contacts: Contact[] }>("/api/contacts")
      .then((d) => alive && setContacts(d.contacts))
      .catch(() => alive && setError("Impossible de charger vos contacts."));
    return () => {
      alive = false;
    };
  }, [open]);

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
      setError(e instanceof ApiError ? e.message : "Les participants n’ont pas été ajoutés.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter des participants"
      footer={
        <Button size="lg" block onClick={add} disabled={chosen.length === 0 || busy}>
          {busy ? "Ajout…" : chosen.length > 1 ? `Ajouter ${chosen.length} participants` : "Ajouter au groupe"}
        </Button>
      }
    >
      <p className="text-sm text-muted">Groupe privé : vous seul ajoutez des participants, choisis parmi vos contacts.</p>
      {contacts === null && !error && <p className="text-sm text-muted">Chargement de vos contacts…</p>}
      {contacts !== null && available.length === 0 && <p className="text-sm text-muted">Tous vos contacts sont déjà dans ce groupe.</p>}
      {available.length > 0 && (
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {available.map((c) => {
            const on = chosen.includes(c.id);
            return (
              <li key={c.id}>
                <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                  <Avatar initials={initials(c.name)} size="sm" />
                  <span className="grid">
                    <span className="text-sm font-bold">{c.name}</span>
                    <span className="text-xs text-muted">{c.city}</span>
                  </span>
                  <input type="checkbox" checked={on} onChange={() => setChosen((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} className="size-5.5 accent-[var(--brand)]" aria-label={`Ajouter ${c.name}`} />
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
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, call: () => Promise<unknown>, after: () => void) {
    setBusy(key);
    setError(null);
    try {
      await call();
      after();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’action n’a pas abouti. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Participants (${detail.members.length})`}
      footer={
        confirmLeave ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
              Annuler
            </Button>
            <Button variant="danger" disabled={busy !== null} onClick={() => run("leave", () => api(`/api/groups/${detail.id}/leave`, { method: "POST" }), onLeft)}>
              {busy === "leave" ? "Départ…" : "Oui, quitter le groupe"}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="lg" block onClick={() => setConfirmLeave(true)}>
            Quitter le groupe
          </Button>
        )
      }
    >
      {confirmLeave && (
        <Alert tone="info">
          Vous ne verrez plus les messages du groupe.{detail.isOwner ? " Le membre le plus ancien deviendra responsable du groupe." : ""}
        </Alert>
      )}
      <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
        {detail.members.map((m) => (
          <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
            <Avatar initials={initials(m.name)} size="sm" />
            <span className="grid">
              <Link href={`/profil/${m.id}`} className="text-sm font-bold text-ink no-underline">
                {m.id === meId ? "Vous" : m.name}
              </Link>
              {m.owner && <span className="text-xs text-muted">Responsable du groupe</span>}
            </span>
            {detail.isOwner && m.id !== meId ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                aria-label={`Retirer ${m.name} du groupe`}
                onClick={() => run(m.id, () => api(`/api/groups/${detail.id}/members/${m.id}`, { method: "DELETE" }), onChanged)}
              >
                {busy === m.id ? "…" : "Retirer"}
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
  );
}
