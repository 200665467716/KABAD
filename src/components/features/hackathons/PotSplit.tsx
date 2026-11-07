import { useFormatter } from "next-intl";
import { cn } from "@/lib/cn";
import { splitPrize } from "@/lib/prize";

/** How a pot is shared (D6): 90 % to the winning team, 10 % to KABAD. */
export function PotSplit({ total, labels, className }: { total: number; labels: { winner: string; platform: string }; className?: string }) {
  const format = useFormatter();
  const s = splitPrize(total);
  const items = [
    { label: labels.winner, value: s.winner, share: 90, dot: "bg-brand" },
    { label: labels.platform, value: s.platform, share: 10, dot: "bg-subtle" },
  ];
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-xs" aria-hidden="true">
        {items.map((it) => (
          <span key={it.label} className={it.dot} style={{ flex: it.share }} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-2">
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
