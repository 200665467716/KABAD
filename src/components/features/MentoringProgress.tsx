"use client";

import { Meter } from "@/components/ui/Display";
import { formatDuration } from "@/lib/format";
import { REQUIRED_MENTORING_MINUTES } from "@/lib/mentoring";
import { usePairSessions } from "@/lib/use-pair";

/** Confirmed mentoring time against the minimum required for cash-prize challenges. */
export function MentoringProgress({ variant = "compact" }: { variant?: "compact" | "pair" }) {
  const { eligibility: e } = usePairSessions();
  if (variant === "pair") {
    return (
      <div className="grid gap-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Temps confirmé par vous deux</span>
          <span className="font-bold tabular">{formatDuration(e.confirmed)}</span>
        </div>
        <Meter value={e.progress} tone={e.eligible ? "success" : "accent"} label="Temps de mentorat confirmé" />
        <span className="text-xs text-muted">{e.eligible ? "Vous pouvez participer aux défis à cagnotte." : `Encore ${formatDuration(e.missing)} pour participer aux défis à cagnotte.`}</span>
      </div>
    );
  }
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted">Mentorat attesté</span>
        <span className="font-bold tabular">
          {formatDuration(Math.min(e.confirmed, REQUIRED_MENTORING_MINUTES))} sur {formatDuration(REQUIRED_MENTORING_MINUTES)}
        </span>
      </div>
      <Meter value={e.progress} tone={e.eligible ? "success" : "accent"} label="Mentorat attesté" />
    </div>
  );
}

export function MentoringTotal() {
  const { eligibility } = usePairSessions();
  return <>{formatDuration(eligibility.confirmed)}</>;
}
