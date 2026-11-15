"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Avatar, AvatarGroup, Badge } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ConversationSummary, ReceivedInvitation, SentInvitation } from "@/lib/messaging-types";
import { useOfflineRefresh, useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { localizeGroupName, localizeSystemText } from "@/lib/system-text";
import { useChatTime } from "./useChatTime";

type Filter = "all" | "people" | "groups";

type Row = { type: "conversation"; at: string; c: ConversationSummary } | { type: "sent"; at: string; i: SentInvitation };

/**
 * Screen MS1: received invitations first, then the conversations, live.
 * An invitation sent and not answered yet shows among the people, with its message: the sender keeps track of it.
 */
export function Inbox({
  me,
  initialConversations,
  initialInvitations,
  initialSent,
}: {
  me: string;
  initialConversations: ConversationSummary[];
  initialInvitations: ReceivedInvitation[];
  initialSent: SentInvitation[];
}) {
  const t = useTranslations("messaging.inbox");
  const locale = useLocale();
  const time = useChatTime();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState(initialConversations);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [sent, setSent] = useState(initialSent);

  const refresh = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([api<{ conversations: ConversationSummary[] }>("/api/conversations"), api<{ received: ReceivedInvitation[]; sent: SentInvitation[] }>("/api/invitations")]);
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
        // My own message means I read the conversation up to it (the server moves my reading mark too).
        unread: message.authorId === me ? 0 : message.system ? target.unread : target.unread + 1,
        last: { body: message.body, authorId: message.authorId, authorName: message.authorName, system: message.system, attachment: message.attachment?.kind ?? null },
      };
      return [updated, ...list.filter((c) => c.id !== conversationId)];
    });
  });
  useRealtime("conversation:changed", () => refresh());
  useRealtime("conversation:read", ({ conversationId }) => setConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))));
  useRealtime("invitation:new", () => refresh());
  useRealtime("invitation:answered", () => refresh());
  useRealtimeReconnect(refresh);
  // Without the realtime server, the list is read again every 5 seconds.
  useOfflineRefresh(refresh, 5_000);
  // The page may come from the browser's cache (back from a conversation, a group just created):
  // it reads the list again when it opens and when the tab comes back to the front.
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // The search looks at the name of the person or of the group, without accents or capitals.
  const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const wanted = plain(query.trim());
  const rows: Row[] = [
    ...conversations.filter((c) => filter === "all" || (filter === "groups") === (c.kind === "GROUP")).map((c): Row => ({ type: "conversation", at: c.lastMessageAt, c })),
    ...(filter === "groups" ? [] : sent.map((i): Row => ({ type: "sent", at: i.createdAt, i }))),
  ]
    .filter((row) => !wanted || plain(row.type === "sent" ? row.i.to.name : row.c.title).includes(wanted))
    .sort((a, b) => b.at.localeCompare(a.at));
  const firstNames = invitations.map((i) => i.from.name.split(" ")[0]);
  const names = firstNames.length <= 1 ? firstNames.join("") : `${firstNames.slice(0, -1).join(", ")} ${t("and")} ${firstNames[firstNames.length - 1]}`;

  return (
    <>
      <TopBar title={t("title")} actions={<IconButton icon="search" label={t("members")} href="/membres" />} />
      <Page narrow>
        {invitations.length > 0 && (
          <Link href="/messages/invitations" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-2 border-dashed border-line-strong p-3.5 text-ink no-underline">
            <AvatarGroup>
              {invitations.slice(0, 2).map((i) => (
                <Avatar key={i.id} initials={initials(i.from.name)} src={i.from.photo} size="sm" />
              ))}
            </AvatarGroup>
            <span className="grid min-w-0">
              <b className="text-[15px]">{t("invites", { count: invitations.length })}</b>
              <small className="truncate text-[13px] text-muted">{t("invitesWho", { names, count: invitations.length })}</small>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
        )}
        <Segmented
          label={t("tabsLabel")}
          stretch
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: t("tabAll") },
            { value: "people", label: t("tabPeople") },
            { value: "groups", label: t("tabGroups") },
          ]}
        />
        {conversations.length + sent.length > 0 && (
          <label className="flex h-12 items-center gap-2 rounded-md border-2 border-line-strong bg-raised px-3.5">
            <Icon name="search" size={18} className="text-muted" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("search")} placeholder={t("searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-base outline-none" />
          </label>
        )}
        {conversations.length === 0 && sent.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-10 text-center">
            <p className="text-muted">{t("empty")}</p>
            <ButtonLink href="/membres" icon="search">
              {t("members")}
            </ButtonLink>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-muted">{wanted ? t("emptySearch", { query: query.trim() }) : t("emptyFilter")}</p>
        ) : (
          <ul className="m-0 list-none overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0 [&>li+li]:border-t-2 [&>li+li]:border-line">
            {rows.map((row) => {
              if (row.type === "sent") {
                const i = row.i;
                return (
                  <li key={`sent-${i.id}`}>
                    <Link href="/messages/invitations" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg">
                      <Avatar initials={initials(i.to.name)} src={i.to.photo} />
                      <span className="grid min-w-0">
                        <b className="truncate text-[15px] leading-5">{i.to.name}</b>
                        <small className="truncate text-[13px] leading-[18px] text-muted">{i.message ? `${t("you")} : ${i.message.split("\n")[0]}` : t("inviteSentNoMessage")}</small>
                      </span>
                      <span className="grid justify-items-end gap-1">
                        <span className="text-xs text-muted tabular">{time.short(i.createdAt)}</span>
                        <Badge tone="brand">{t("pending")}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              }
              const c = row.c;
              const group = c.kind === "GROUP";
              const title = group ? localizeGroupName(c.title, locale) : c.title;
              const author = c.last && !c.last.system && (group || c.last.authorId === me) ? `${c.last.authorId === me ? t("you") : (c.last.authorName ?? "").split(" ")[0]} : ` : "";
              return (
                <li key={c.id}>
                  <Link href={`/messages/${c.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg">
                    <Avatar initials={initials(title)} src={c.photo} square={group} tone={group ? "neutral" : "brand"} />
                    <span className="grid min-w-0">
                      <b className="truncate text-[15px] leading-5">{title}</b>
                      <small className={c.unread > 0 ? "truncate text-[13px] leading-[18px] font-bold text-ink" : "truncate text-[13px] leading-[18px] text-muted"}>{c.last ? `${author}${localizeSystemText(c.last.body, locale, c.last.system).split("\n")[0] || (c.last.attachment === "VOICE" ? t("voiceNote") : c.last.attachment === "FILE" ? t("file") : "")}` : t("noMessage")}</small>
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <span className="text-xs text-muted tabular">{time.short(c.lastMessageAt)}</span>
                      {c.unread > 0 && (
                        <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-extrabold text-on-danger tabular" aria-label={t("unread", { count: c.unread })}>
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {/* MS1: the floating button, above the tab bar on a phone. It is the one indigo button of the screen. */}
        <ButtonLink href="/messages/groupes/nouveau" icon="users" size="lg" className="sticky bottom-22 z-10 justify-self-end shadow-pop lg:bottom-6">
          {t("newGroup")}
        </ButtonLink>
      </Page>
    </>
  );
}
