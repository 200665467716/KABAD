"use client";

import { useState } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Card, Overline, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { member, receivedReport, test } from "@/lib/data";
import { initials } from "@/lib/format";

export function ReportReview({ testId }: { testId: string }) {
  const t = test(testId)!;
  const r = receivedReport;
  const tester = member(r.testerId);
  const [state, setState] = useState<"pending" | "refusing" | "validated" | "refused">("pending");

  return (
    <>
      <TopBar back="/tests" title="Rapports reçus" subtitle={`${t.name} · ${t.reportsCount} rapports, ${t.toRead} à lire`} />
      <Page narrow className="flex-1">
        <PersonRow avatar={<Avatar initials={initials(tester.name)} tone="accent" />} name={tester.name} meta={`Testé sur ${r.device} · ${r.at} · ${r.duration}`} />
        <Card className="gap-3">
          <Overline as="h2">Questions de contrôle</Overline>
          {r.answers.map((a) => (
            <div key={a.label} className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5">
              <Icon name={a.correct ? "checkCircle" : "info"} size={20} className={a.correct ? "text-success" : "text-danger"} strokeWidth={2} />
              <span className="grid">
                <span className="text-sm text-muted">{a.label}</span>
                <span className="text-sm font-bold tabular">
                  {a.value} · {a.correct ? "bonne réponse" : "réponse inattendue"}
                </span>
              </span>
            </div>
          ))}
        </Card>
        <section className="grid gap-2">
          <Overline as="h2">Captures</Overline>
          <div className="flex gap-2" aria-label="3 captures d’écran du testeur" role="img">
            {[4, 5, 3].map((lines, i) => (
              <span key={i} className="grid h-26 w-16 content-start gap-1 rounded-md border border-line bg-sunken px-1.5 py-2" aria-hidden="true">
                {Array.from({ length: lines }).map((_, j) => (
                  <i key={j} className={j === 0 ? "block h-1 w-[70%] rounded-xs bg-brand" : "block h-1 rounded-xs bg-line-strong/45"} />
                ))}
              </span>
            ))}
          </div>
        </section>
        <section className="grid gap-2">
          <Overline as="h2">Remarques</Overline>
          <p className="rounded-md bg-sunken px-3.5 py-3 text-sm">{r.remarks}</p>
        </section>
        {state === "refusing" && <TextArea id="refusal" label="Pourquoi refusez-vous ce rapport ?" rows={3} hint="Kossi verra votre réponse et pourra refaire le test." />}
        <div aria-live="polite">
          {state === "validated" && (
            <Alert tone="success" title="Rapport validé.">
              Kossi est prévenu et le test compte sur son profil.
            </Alert>
          )}
          {state === "refused" && <Alert tone="info" title="Rapport refusé.">Kossi a reçu votre explication.</Alert>}
        </div>
      </Page>
      <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
        {state === "refusing" ? (
          <>
            <Button variant="secondary" onClick={() => setState("pending")}>
              Annuler
            </Button>
            <Button variant="danger" onClick={() => setState("refused")}>
              Refuser le rapport
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={state !== "pending"} onClick={() => setState("refusing")}>
              Refuser
            </Button>
            <Button variant="success" disabled={state !== "pending"} icon={state === "validated" ? "check" : undefined} onClick={() => setState("validated")}>
              {state === "validated" ? "Validé" : "Valider le rapport"}
            </Button>
          </>
        )}
      </ActionBar>
    </>
  );
}
