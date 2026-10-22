/** Minimal highlighting for keywords, strings and comments: enough for a short excerpt. */
export function CodeExcerpt({ source }: { source: string }) {
  const parts = source.split(/('[^']*'|"[^"]*"|\/\/.*$|\b(?:const|let|await|async|if|return|function|import|from|export)\b)/gm);
  return (
    <pre className="m-0 overflow-x-auto bg-code px-4 py-3.5 font-mono text-[13px] leading-5 text-on-code">
      {parts.map((p, i) =>
        /^(const|let|await|async|if|return|function|import|from|export)$/.test(p) ? (
          <span key={i} className="text-[var(--maize-300)]">{p}</span>
        ) : p.startsWith("'") || p.startsWith('"') ? (
          <span key={i} className="text-[var(--palm-300)]">{p}</span>
        ) : p.startsWith("//") ? (
          <span key={i} className="text-[var(--neutral-400)]">{p}</span>
        ) : (
          p
        ),
      )}
    </pre>
  );
}
