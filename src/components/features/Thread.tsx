"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Splits a message on ``` fences: odd parts are code. */
function parts(text: string) {
  return text.split("```").map((p, i) => ({ code: i % 2 === 1, text: i % 2 === 1 ? p.replace(/^\w*\n/, "").replace(/\n$/, "") : p }));
}

export function MessageBody({ text }: { text: string }) {
  return (
    <>
      {parts(text).map((p, i) =>
        p.code ? (
          <pre key={i} className="my-1 overflow-x-auto rounded-sm bg-code px-3 py-2 font-mono text-[13px] leading-5 text-on-code">
            {p.text}
          </pre>
        ) : p.text.trim() ? (
          <span key={i} className="break-words whitespace-pre-line">
            {p.text.replace(/^\n+|\n+$/g, "")}
          </span>
        ) : null,
      )}
    </>
  );
}

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
}) {
  const t = useTranslations("messaging.bubble");
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
      {!hidden && attachment}
      {hidden ? <p className="text-sm italic opacity-80">{text}</p> : text ? <MessageBody text={text} /> : null}
      <span className="justify-self-end text-[11px] font-bold opacity-75 tabular">
        {status === "sending" ? t("sending") : status === "failed" ? t("failed") : time}
      </span>
      {onReport && !hidden && (
        <button type="button" onClick={onReport} className="justify-self-start text-xs text-muted underline-offset-2 hover:underline">
          {t("report")}
        </button>
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
