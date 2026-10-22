import Link from "next/link";
import { Badge } from "@/components/ui/Display";
import { formatDuration } from "@/lib/format";
import { isSessionCounted } from "@/lib/mentoring";
import { shortDate } from "@/lib/time";
import type { SessionView } from "@/lib/domain-types";

export function SessionJournal({ sessions }: { sessions: SessionView[] }) {
  if (sessions.length === 0) {
    return <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Aucune séance notée pour l’instant. Après votre première visio, notez-la ici.</p>;
  }
  return (
    <ul className="m-0 grid list-none rounded-lg border border-line bg-raised px-4 py-1 shadow-sm">
      {sessions.map((s) => (
        <li key={s.id} className="border-t border-line first:border-0">
          <Link href={`/mentorat/seances/${s.id}`} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-ink no-underline">
            <span className="text-sm text-muted tabular">{shortDate(s.startsAt)}</span>
            <span className="grid min-w-0 gap-1">
              <span className="truncate text-sm font-bold">{s.topic}</span>
              {isSessionCounted(s) ? <Badge tone="success" className="justify-self-start">Confirmée</Badge> : <Badge tone="accent" className="justify-self-start">À confirmer</Badge>}
            </span>
            <span className="font-mono text-sm tabular">{formatDuration(s.minutes)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
