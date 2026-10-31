"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { agoLabel } from "@/lib/time";
import type { TestAppSummary, TestReportView } from "@/lib/domain-types";

const STATUS = { SUBMITTED: { label: "À lire", tone: "accent" }, VALIDATED: { label: "Validé", tone: "success" }, REFUSED: { label: "Refusé", tone: "danger" } } as const;

function ReportCard({ r }: { r: TestReportView }) {
  const router = useRouter();
  const first = r.tester.name.split(" ")[0];
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(validate: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/test-reports/${r.id}`, { body: validate ? { validate: true } : { validate: false, reason } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La réponse n’a pas été enregistrée. Réessayez.");
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <PersonRow avatar={<Avatar initials={initials(r.tester.name)} tone="accent" />} name={r.tester.name} meta={`${r.device} · ${agoLabel(r.createdAt)}`} />
        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
      </div>
      <div className="grid gap-2">
        <Overline as="h3">Questions de contrôle</Overline>
        {r.answers.map((a) => (
          <div key={a.question} className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5">
            <Icon name={a.correct ? "checkCircle" : "info"} size={20} className={a.correct ? "text-success" : "text-danger"} strokeWidth={2} />
            <span className="grid">
              <span className="text-sm text-muted">{a.question}</span>
              <span className="text-sm font-bold">
                {a.answer} · {a.correct ? "bonne réponse" : "réponse inattendue"}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Overline as="h3">Captures</Overline>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: r.screenshots }, (_, i) => (
            <a key={i} href={`/api/test-reports/${r.id}/captures/${i}`} target="_blank" rel="noreferrer" aria-label={`Ouvrir la capture de l’étape ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the API to the owner only */}
              <img src={`/api/test-reports/${r.id}/captures/${i}`} alt="" className="h-26 w-16 rounded-md border border-line bg-sunken object-cover" />
            </a>
          ))}
        </div>
      </div>
      {r.remarks && (
        <div className="grid gap-2">
          <Overline as="h3">Remarques</Overline>
          <p className="rounded-md bg-sunken px-3.5 py-3 text-sm whitespace-pre-line">{r.remarks}</p>
        </div>
      )}
      {r.status === "REFUSED" && r.refusalReason && <p className="text-sm text-muted">Motif du refus : {r.refusalReason}</p>}
      {r.status === "SUBMITTED" &&
        (refusing ? (
          <div className="grid gap-2">
            <TextArea id={`refus-${r.id}`} label="Pourquoi refusez-vous ce rapport ?" rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} hint={`${first} verra votre réponse et pourra refaire le test.`} />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button variant="secondary" onClick={() => setRefusing(false)} disabled={busy}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => review(false)} disabled={busy}>
                Refuser le rapport
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Button variant="secondary" onClick={() => setRefusing(true)} disabled={busy}>
              Refuser
            </Button>
            <Button variant="success" onClick={() => review(true)} disabled={busy} aria-label={`Valider le rapport de ${r.tester.name}`}>
              Valider le rapport
            </Button>
          </div>
        ))}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function ReportReview({ app, reports }: { app: TestAppSummary; reports: TestReportView[] }) {
  return (
    <>
      <TopBar back="/tests" title="Rapports reçus" subtitle={`${app.name} · ${app.reportsCount} rapport${app.reportsCount > 1 ? "s" : ""}, ${app.toRead} à lire`} />
      <Page narrow>
        {reports.length === 0 ? <p className="py-8 text-center text-muted">Aucun rapport pour l’instant. Les testeurs de la communauté vont arriver.</p> : reports.map((r) => <ReportCard key={r.id} r={r} />)}
      </Page>
    </>
  );
}
