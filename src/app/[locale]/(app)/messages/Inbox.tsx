"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Avatar, AvatarGroup } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ConversationSummary, ReceivedInvitation } from "@/lib/messaging-types";
import { useRealtime, useRealtimeReconnect } from "@/lib/realtime-client";
import { useChatTime } from "./useChatTime";

type Filter = "all" | "people" | "groups";

/** Screen MS1: received invitations first, then the conversations, live. */
export function Inbox({ me, initialConversations, initialInvitations }: { me: string; initialConversations: ConversationSummary[]; initialInvitations: ReceivedInvitation[] }) {
  const t = useTranslations("messaging.inbox");
  const time = useChatTime();
  const [filter, setFilter] = useState<Filter>("all");
  const [conversations, setConversations] = useState(initialConversations);
  const [invitations, setInvitations] = useState(initialInvitations);

  const refresh = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([api<{ conversations: ConversationSummary[] }>("/api/conversations"), api<{ received: ReceivedInvitation[] }>("/api/invitations")]);
      setConversations(c.conversations);
      setInvitations(i.received);
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

  const shown = conversations.filter((c) => filter === "all" || (filter === "groups") === (c.kind === "GROUP"));
  const firstNames = invitations.map((i) => i.from.name.split(" ")[0]);
  const names = firstNames.length <= 1 ? firstNames.join("") : `${firstNames.slice(0, -1).join(", ")} ${t("and")} ${firstNames[firstNames.length - 1]}`;

  return (
    <>
      <TopBar title={t("title")} actions={<IconButton icon="search" label={t("members")} href="/membres" />} />
      <Page narrow>
        {invitations.length > 0 && (
          <Link href="/messages/invitations" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-3.5 text-ink no-underline shadow-pop">
            <AvatarGroup>
              {invitations.slice(0, 2).map((i) => (
                <Avatar key={i.id} initials={initials(i.from.name)} size="sm" />
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
        {conversations.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-10 text-center">
            <p className="text-muted">{t("empty")}</p>
            <ButtonLink href="/membres" icon="search">
              {t("members")}
            </ButtonLink>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-muted">{t("emptyFilter")}</p>
        ) : (
          <ul className="m-0 list-none overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0 [&>li+li]:border-t-2 [&>li+li]:border-line">
            {shown.map((c) => {
              const group = c.kind === "GROUP";
              const author = c.last && !c.last.system && (group || c.last.authorId === me) ? `${c.last.authorId === me ? t("you") : (c.last.authorName ?? "").split(" ")[0]} : ` : "";
              return (
                <li key={c.id}>
                  <Link href={`/messages/${c.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg">
                    <Avatar initials={initials(c.title)} square={group} tone={group ? "neutral" : "brand"} />
                    <span className="grid min-w-0">
                      <b className="truncate text-[15px] leading-5">{c.title}</b>
                      <small className={c.unread > 0 ? "truncate text-[13px] leading-[18px] font-bold text-ink" : "truncate text-[13px] leading-[18px] text-muted"}>{c.last ? `${author}${c.last.body.split("\n")[0] || (c.last.attachment === "VOICE" ? t("voiceNote") : c.last.attachment === "FILE" ? t("file") : "")}` : t("noMessage")}</small>
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
        <ButtonLink href="/messages/groupes/nouveau" variant="ink" icon="users" block className="md:w-auto md:justify-self-start">
          {t("newGroup")}
        </ButtonLink>
      </Page>
    </>
  );
}
