"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { splitMentions, type MentionMember } from "@/lib/mentions";
import type { ChatQuote } from "@/lib/messaging-types";

/** Splits a message on ``` fences: odd parts are code. */
function parts(text: string) {
  return text.split("```").map((p, i) => ({ code: i % 2 === 1, text: i % 2 === 1 ? p.replace(/^\w*\n/, "").replace(/\n$/, "") : p }));
}

/** The members a group message can mention, and who reads it: a mention of the reader stands out more. */
export type MentionContext = { members: MentionMember[]; meId: string };

function WithMentions({ text, mentions }: { text: string; mentions?: MentionContext }) {
  if (!mentions) return <>{text}</>;
  return (
    <>
      {splitMentions(text, mentions.members).map((p, i) =>
        p.mention ? (
          <span key={i} className={cn("rounded-[6px] px-0.5 font-extrabold", p.mention === mentions.meId ? "bg-brand-wash text-brand-text" : "underline decoration-2 underline-offset-2")}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function MessageBody({ text, mentions }: { text: string; mentions?: MentionContext }) {
  return (
    <>
      {parts(text).map((p, i) =>
        p.code ? (
          <pre key={i} className="my-1 overflow-x-auto rounded-sm bg-code px-3 py-2 font-mono text-[13px] leading-5 text-on-code">
            {p.text}
          </pre>
        ) : p.text.trim() ? (
          <span key={i} className="break-words whitespace-pre-line">
            <WithMentions text={p.text.replace(/^\n+|\n+$/g, "")} mentions={mentions} />
          </span>
        ) : null,
      )}
    </>
  );
}

/** The answered message, quoted at the top of a reply. A tap brings the original into view. */
export function Quote({ quote, mine, onOpen }: { quote: ChatQuote; mine?: boolean; onOpen?: () => void }) {
  const t = useTranslations("messaging.bubble");
  const text = quote.kind === "VOICE" && !quote.body ? t("voice") : quote.body || t("file");
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("grid min-w-0 gap-0.5 rounded-[10px] border-l-4 px-2.5 py-1.5 text-left text-[13px] leading-[18px]", mine ? "border-on-brand/70 bg-on-brand/15" : "border-brand bg-bg")}
    >
      <span className="truncate font-extrabold">{quote.authorName ?? t("member")}</span>
      <span className={cn("line-clamp-2 break-words", quote.hidden && "italic opacity-80")}>{text}</span>
    </button>
  );
}

export type BubbleAction = { label: string; onClick: () => void };

export function MessageBubble({
  text,
  time,
  mine,
  author,
  authorTone,
  status,
  onRetry,
  hidden,
  onReport,
  attachment,
  quote,
  actions,
  mentions,
  pinned,
}: {
  text: string;
  /** A file or a voice note, shown above the caption. */
  attachment?: ReactNode;
  hidden?: boolean;
  onReport?: () => void;
  time?: string;
  mine?: boolean;
  author?: string;
  authorTone?: "brand" | "accent";
  status?: "sending" | "failed";
  onRetry?: () => void;
  /** The answered message, quoted above the text. */
  quote?: ReactNode;
  /** Answer, pin…: small links under the message. */
  actions?: BubbleAction[];
  mentions?: MentionContext;
  pinned?: boolean;
}) {
  const t = useTranslations("messaging.bubble");
  const links = [...(actions ?? []), ...(onReport ? [{ label: t("report"), onClick: onReport }] : [])];
  return (
    <div
      className={cn(
        "grid max-w-[80%] min-w-0 gap-0.5 border-2 px-3 py-2 text-[15px] leading-[21px]",
        mine ? "justify-self-end rounded-[16px_16px_4px_16px] border-brand bg-brand text-on-brand" : "justify-self-start rounded-[16px_16px_16px_4px] border-line-strong bg-raised text-ink",
        status === "sending" && "opacity-70",
        status === "failed" && "outline-2 outline-danger",
      )}
    >
      {author && <span className={cn("text-xs font-extrabold", authorTone === "accent" ? "text-accent-text" : "text-brand-text")}>{author}</span>}
      {!hidden && quote}
      {!hidden && attachment}
      {hidden ? <p className="text-sm italic opacity-80">{text}</p> : text ? <MessageBody text={text} mentions={mentions} /> : null}
      <span className="flex items-center justify-end gap-1.5 text-[11px] font-bold opacity-75 tabular">
        {pinned && <span>{t("pinned")} ·</span>}
        {status === "sending" ? t("sending") : status === "failed" ? t("failed") : time}
      </span>
      {!hidden && !status && links.length > 0 && (
        <span className="flex flex-wrap gap-x-3 justify-self-start">
          {links.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} className={cn("min-h-7 text-xs underline-offset-2 hover:underline", mine ? "text-on-brand/80" : "text-muted")}>
              {a.label}
            </button>
          ))}
        </span>
      )}
      {status === "failed" && onRetry && (
        <button type="button" onClick={onRetry} className="justify-self-end text-xs font-bold underline">
          {t("retry")}
        </button>
      )}
    </div>
  );
}

export function SystemLine({ children }: { children: string }) {
  return <p className="max-w-[86%] justify-self-center text-center text-xs text-muted">{children}</p>;
}
