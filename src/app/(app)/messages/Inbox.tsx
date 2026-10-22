"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Avatar, CardLink, Overline, PersonRow } from "@/components/ui/Display";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ConversationSummary, ReceivedInvitation, SentInvitation } from "@/lib/messaging-types";
import { useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { shortTime } from "@/lib/time";

export function Inbox({ me, initialConversations, initialInvitations, initialSent }: { me: string; initialConversations: ConversationSummary[]; initialInvitations: ReceivedInvitation[]; initialSent: SentInvitation[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("onglet") === "invitations" ? "inv" : "conv";
  const [conversations, setConversations] = useState(initialConversations);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [sent, setSent] = useState(initialSent);

  const refresh = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([
        api<{ conversations: ConversationSummary[] }>("/api/conversations"),
        api<{ received: ReceivedInvitation[]; sent: SentInvitation[] }>("/api/invitations"),
      ]);
      setConversations(c.conversations);
      setInvitations(i.received);
      setSent(i.sent);
    } catch {
      // Keep what is on screen; the next event or reconnection will try again.
    }
  }, []);

  useRealtime("message:new", ({ conversationId, message }) => {
    if (!conversations.some((c) => c.id === conversationId)) {
      refresh();
      return;
    }
    setConversations((list) => {
      const target = list.find((c) => c.id === conversationId)!;
      const updated: ConversationSummary = {
        ...target,
        lastMessageAt: message.createdAt,
        unread: message.authorId !== me && !message.system ? target.unread + 1 : target.unread,
        last: { body: message.body, authorId: message.authorId, authorName: message.authorName, system: message.system },
      };
      return [updated, ...list.filter((c) => c.id !== conversationId)];
    });
  });
  useRealtime("conversation:changed", () => refresh());
  useRealtime("conversation:read", ({ conversationId }) => setConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))));
  useRealtime("invitation:new", () => refresh());
  useRealtime("invitation:answered", () => refresh());

  async function cancel(id: string) {
    setSent((list) => list.filter((x) => x.id !== id));
    await api(`/api/invitations/${id}`, { method: "DELETE" }).catch(refresh);
  }
  useRealtimeReconnect(refresh);

  return (
    <>
      <TopBar
        title="Messages"
        actions={
          <>
            <ButtonLink href="/membres" size="sm" variant="secondary" icon="search">
              Membres
            </ButtonLink>
            <ButtonLink href="/messages/groupes/nouveau" size="sm" variant="secondary" icon="users">
              Groupe
            </ButtonLink>
          </>
        }
      >
        <Segmented
          label="Messages"
          stretch
          className="lg:inline-grid lg:min-w-[360px]"
          value={tab}
          onChange={(v) => router.replace(v === "inv" ? "/messages?onglet=invitations" : "/messages", { scroll: false })}
          items={[
            { value: "conv", label: "Discussions" },
            { value: "inv", label: "Invitations", count: invitations.length },
          ]}
        />
      </TopBar>
      <Page narrow>
        {tab === "conv" ? (
          conversations.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-10 text-center">
              <p className="text-muted">Pas encore de conversation. Trouvez un développeur et envoyez-lui une invitation : la discussion s’ouvre quand il accepte.</p>
              <ButtonLink href="/membres" icon="search">
                Trouver des membres
              </ButtonLink>
            </div>
          ) : (
            <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
              {conversations.map((c) => {
                const group = c.kind === "GROUP";
                const author = c.last && !c.last.system && (group || c.last.authorId === me) ? `${c.last.authorId === me ? "Vous" : (c.last.authorName ?? "").split(" ")[0]} : ` : "";
                return (
                  <li key={c.id}>
                    <Link href={`/messages/${c.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-sunken/50">
                      <Avatar initials={initials(c.title)} square={group} tone={group ? "neutral" : "brand"} />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="font-bold">{group ? `Groupe ${c.title}` : c.title}</span>
                        <span className={c.unread > 0 ? "truncate text-sm text-ink" : "truncate text-sm text-muted"}>{c.last ? `${author}${c.last.body.split("\n")[0]}` : "Aucun message"}</span>
                      </span>
                      <span className="grid justify-items-end gap-1">
                        <span className="text-xs text-subtle tabular">{shortTime(c.lastMessageAt)}</span>
                        {c.unread > 0 && (
                          <span className="h-5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 text-on-brand tabular" aria-label={`${c.unread} non lus`}>
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <>
            <section className="grid gap-2" aria-labelledby="inv-received">
              <Overline as="h2" id="inv-received">
                Reçues
              </Overline>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted">Aucune invitation en attente.</p>
              ) : (
                <>
                  <p className="text-sm text-muted">Lisez le premier message. La conversation s’ouvre si vous acceptez.</p>
                  {invitations.map((i) => (
                    <CardLink key={i.id} href={`/messages/invitations/${i.id}`} className="gap-2.5">
                      <PersonRow avatar={<Avatar initials={initials(i.from.name)} />} name={i.from.name} meta={[i.from.city, i.from.stack.join(", ")].filter(Boolean).join(" · ")} />
                      <p className="rounded-md bg-sunken px-3 py-2.5 text-sm">{i.message}</p>
                    </CardLink>
                  ))}
                </>
              )}
            </section>
            <section className="grid gap-2" aria-labelledby="inv-sent">
              <Overline as="h2" id="inv-sent">
                Envoyées, en attente de réponse
              </Overline>
              {sent.length === 0 ? (
                <p className="text-sm text-muted">
                  Aucune.{" "}
                  <Link href="/membres" className="font-bold text-brand-text">
                    Trouver des membres à inviter
                  </Link>
                </p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
                  {sent.map((i) => (
                    <li key={i.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                      <Avatar initials={initials(i.to.name)} size="sm" />
                      <span className="grid min-w-0">
                        <Link href={`/profil/${i.toId}`} className="font-bold text-ink no-underline">
                          {i.to.name}
                        </Link>
                        <span className="truncate text-sm text-muted">
                          {shortTime(i.createdAt)} · {i.message}
                        </span>
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => cancel(i.id)} aria-label={`Annuler l’invitation à ${i.to.name}`}>
                        Annuler
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </Page>
    </>
  );
}
