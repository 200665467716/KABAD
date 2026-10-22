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
}: {
  text: string;
  hidden?: boolean;
  onReport?: () => void;
  time?: string;
  mine?: boolean;
  author?: string;
  authorTone?: "brand" | "accent";
  status?: "sending" | "failed";
  onRetry?: () => void;
}) {
  return (
    <div
      className={cn(
        "grid max-w-[85%] min-w-0 gap-0.5 rounded-md px-3 py-2",
        mine ? "justify-self-end rounded-br-xs bg-brand text-on-brand" : "justify-self-start rounded-bl-xs border border-line bg-raised text-ink",
        status === "sending" && "opacity-70",
        status === "failed" && "outline-2 outline-danger",
      )}
    >
      {author && <span className={cn("text-xs font-bold", authorTone === "accent" ? "text-accent-text" : "text-brand-text")}>{author}</span>}
      {hidden ? <p className="text-sm italic opacity-80">{text}</p> : <MessageBody text={text} />}
      <span className="justify-self-end text-xs opacity-80 tabular">
        {status === "sending" ? "Envoi…" : status === "failed" ? "Non envoyé" : time}
      </span>
      {onReport && !hidden && (
        <button type="button" onClick={onReport} className="justify-self-start text-xs text-muted underline-offset-2 hover:underline">
          Signaler ce message
        </button>
      )}
      {status === "failed" && onRetry && (
        <button type="button" onClick={onRetry} className="justify-self-end text-xs font-bold underline">
          Réessayer
        </button>
      )}
    </div>
  );
}

export function SystemLine({ children }: { children: string }) {
  return <p className="max-w-[86%] justify-self-center text-center text-xs text-muted">{children}</p>;
}
