import { cn } from "@/lib/cn";

/** Highlights keywords and annotations in a short code excerpt. */
function CodeBlock({ code }: { code: string }) {
  const parts = code.split(/(\b(?:model|if|return|await|const)\b|@\w+)/g);
  return (
    <pre className="my-1 overflow-x-auto rounded-sm bg-code px-3 py-2 font-mono text-[13px] leading-5 text-on-code">
      {parts.map((p, i) =>
        /^(model|if|return|await|const)$/.test(p) || p.startsWith("@") ? (
          <span key={i} className="text-[var(--maize-300)]">{p}</span>
        ) : (
          p
        ),
      )}
    </pre>
  );
}

export function MessageBubble({ text, code, time, mine, author, authorTone }: { text: string; code?: string; time?: string; mine?: boolean; author?: string; authorTone?: "brand" | "accent" }) {
  return (
    <div
      className={cn(
        "grid max-w-[85%] gap-0.5 rounded-md px-3 py-2",
        mine ? "justify-self-end rounded-br-xs bg-brand text-on-brand" : "justify-self-start rounded-bl-xs border border-line bg-raised text-ink",
      )}
    >
      {author && <span className={cn("text-xs font-bold", authorTone === "accent" ? "text-accent-text" : "text-brand-text")}>{author}</span>}
      <span className="whitespace-pre-line">{text}</span>
      {code && <CodeBlock code={code} />}
      {time && <span className="justify-self-end text-xs opacity-80 tabular">{time}</span>}
    </div>
  );
}

export function SystemLine({ children }: { children: string }) {
  return <p className="max-w-[86%] justify-self-center text-center text-xs text-muted">{children}</p>;
}
