"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { agoLabel } from "@/lib/time";
import type { ReportContext, ReportDecision } from "@/server/admin";

const TARGET: Record<ReportContext["targetType"], string> = { USER: "Profil", MESSAGE: "Message", CONVERSATION: "Conversation", INVITATION: "Invitation", ROOM: "Salon vocal" };

function ReportCard({ r }: { r: ReportContext }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ReportDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: ReportDecision) {
    if ((decision === "warn" || decision === "suspend") && note.trim().length < 5) return setError("Écrivez le motif : le membre le lira.");
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/admin/reports/${r.id}`, { body: { decision, note: note.trim() || undefined } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’action n’a pas abouti.");
      setBusy(null);
    }
  }

  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="danger">{r.reason}</Badge>
        <Badge>{TARGET[r.targetType]}</Badge>
        <span className="text-xs text-muted">
          {agoLabel(r.createdAt)} · par{" "}
          <Link href={`/profil/${r.reporter.id}`} className="text-muted">
            {r.reporter.name}
          </Link>
        </span>
      </div>
      {r.target && (
        <p className="text-sm">
          Membre visé :{" "}
          <Link href={`/profil/${r.target.id}`} className="font-bold">
            {r.target.name}
          </Link>
          {r.targetReports > 1 && <b className="text-danger"> · {r.targetReports} signalements au total</b>}
          {r.target.suspended && <b> · déjà suspendu</b>}
        </p>
      )}
      {r.details && <p className="rounded-md bg-sunken px-3 py-2 text-sm">« {r.details} »</p>}
      {r.excerpt.length > 0 && (
        <ul className="m-0 grid list-none gap-1.5 rounded-md border border-line p-3">
          {r.excerpt.map((x, i) => (
            <li key={i} className={x.reported ? "rounded-xs bg-danger-soft px-2 py-1 text-sm" : "px-2 text-sm text-muted"}>
              <b>{x.author}</b> : {x.body}
              {x.hidden && <em> (déjà retiré)</em>}
            </li>
          ))}
        </ul>
      )}
      {r.status === "REVIEWED" ? (
        <p className="text-sm text-muted">Décision : {r.resolution}</p>
      ) : (
        <>
          <TextField id={`note-${r.id}`} label="Motif ou note (lu par le membre en cas d’avertissement)" value={note} maxLength={250} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("dismiss")}>
              Classer sans suite
            </Button>
            {(r.targetType === "MESSAGE" || r.targetType === "ROOM") && (
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("hide")}>
                {r.targetType === "ROOM" ? "Fermer le salon" : "Retirer le message"}
              </Button>
            )}
            {r.target && (
              <>
                <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("warn")}>
                  Avertir
                </Button>
                <Button size="sm" variant="danger" disabled={busy !== null || r.target.suspended} onClick={() => decide("suspend")}>
                  Suspendre le compte
                </Button>
              </>
            )}
          </div>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </>
      )}
    </Card>
  );
}

export function ReportQueue({ reports, status }: { reports: ReportContext[]; status: "OPEN" | "REVIEWED" }) {
  return (
    <>
      <div className="flex gap-3 text-sm font-bold">
        <Link href="/admin/signalements" aria-current={status === "OPEN" ? "page" : undefined} className={status === "OPEN" ? "text-ink" : "text-muted"}>
          À traiter
        </Link>
        <Link href="/admin/signalements?vue=traites" aria-current={status === "REVIEWED" ? "page" : undefined} className={status === "REVIEWED" ? "text-ink" : "text-muted"}>
          Déjà traités
        </Link>
      </div>
      {reports.length === 0 && <p className="py-8 text-center text-muted">{status === "OPEN" ? "Aucun signalement à traiter." : "Aucun signalement traité."}</p>}
      {reports.map((r) => (
        <ReportCard key={r.id} r={r} />
      ))}
    </>
  );
}
