import { useFormatter } from "next-intl";
import { cn } from "@/lib/cn";
import { splitPrize } from "@/lib/prize";

/** How a pot is shared (D6): 60/30/10 with a mentor (level 3), 90/10 without (level 2). */
export function PotSplit({ total, withMentor, labels, className }: { total: number; withMentor: boolean; labels: { winner: string; mentor: string; platform: string }; className?: string }) {
  const format = useFormatter();
  const s = splitPrize(total, withMentor);
  const items = [
    { label: labels.winner, value: s.winner, share: withMentor ? 60 : 90, dot: "bg-brand" },
    ...(withMentor ? [{ label: labels.mentor, value: s.mentor, share: 30, dot: "bg-accent" }] : []),
    { label: labels.platform, value: s.platform, share: 10, dot: "bg-subtle" },
  ];
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-xs" aria-hidden="true">
        {items.map((it) => (
          <span key={it.label} className={it.dot} style={{ flex: it.share }} />
        ))}
      </div>
      <dl className={cn("grid gap-2", withMentor ? "grid-cols-3" : "grid-cols-2")}>
        {items.map((it) => (
          <div key={it.label} className="grid gap-0.5">
            <dt className="flex items-center gap-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
              <span className={cn("size-2 rounded-xs", it.dot)} />
              {it.share} % · {it.label}
            </dt>
            <dd className="m-0 font-bold tabular">{format.number(it.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
