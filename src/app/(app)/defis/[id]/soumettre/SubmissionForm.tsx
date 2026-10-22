"use client";

import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { OPERATORS, SUBMISSION_MAX } from "@/lib/schemas";
import type { ChallengeDetail } from "@/lib/domain-types";

export function SubmissionForm({ challengeId, title, closes, hasCash, initial }: { challengeId: string; title: string; closes: string; hasCash: boolean; initial: ChallengeDetail["mySubmission"] }) {
  const [explain, setExplain] = useState(initial?.explanation ?? "");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/challenges/${challengeId}/submission`, {
        method: "PUT",
        body: {
          repoUrl: String(data.get("repo") ?? ""),
          demoUrl: String(data.get("demo") ?? ""),
          explanation: explain,
          ...(hasCash ? { payoutOperator: String(data.get("operator") ?? ""), payoutPhone: String(data.get("phone") ?? "") } : {}),
          solo: data.get("solo") === "on",
          explainable: data.get("explainable") === "on",
        },
      });
      setSent(true);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "La solution n’a pas été envoyée. Réessayez." });
    } finally {
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={`/defis/${challengeId}`} close title="Ma solution" subtitle={title} />
      <Page narrow className="flex-1">
        {sent ? (
          <Alert tone="success" role="status" title="Solution soumise.">
            Vous pouvez la modifier jusqu’au {closes}. Le jury publiera les résultats après la clôture.
          </Alert>
        ) : (
          <>
            <TextField id="repo" name="repo" type="url" label="Lien du dépôt public" defaultValue={initial?.repoUrl} placeholder="https://github.com/vous/projet" inputClassName="font-mono text-sm" error={fieldError("repoUrl")} hint="Le jury lit le code et lance les tests." />
            <TextField id="demo" name="demo" type="url" label="Démo en ligne (facultatif)" defaultValue={initial?.demoUrl ?? ""} placeholder="https://" inputClassName="font-mono text-sm" error={fieldError("demoUrl")} />
            <TextArea id="explain" name="explain" label="Expliquez vos choix au jury" rows={5} value={explain} maxLength={SUBMISSION_MAX} onChange={(e) => setExplain(e.target.value)} counter={`${Array.from(explain).length} / ${SUBMISSION_MAX}`} error={fieldError("explanation")} />
            {hasCash && (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-bold">Pour recevoir votre gain</legend>
                <div className="grid grid-cols-[136px_minmax(0,1fr)] gap-2">
                  <Select id="operator" name="operator" label={<span className="sr-only">Opérateur</span>} defaultValue={initial?.payoutOperator ?? OPERATORS[0]}>
                    {OPERATORS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                  <TextField id="phone" name="phone" type="tel" label={<span className="sr-only">Numéro Mobile Money</span>} defaultValue={initial?.payoutPhone ?? ""} placeholder="+228 90 00 00 00" inputClassName="tabular" error={fieldError("payoutPhone")} />
                </div>
              </fieldset>
            )}
            <div className="grid gap-2 rounded-md bg-sunken px-3.5 py-3">
              <Checkbox name="solo" defaultChecked={initial !== null}>
                J’ai écrit ce code seul. L’aide de mon mentor porte sur l’apprentissage, pas sur la solution.
              </Checkbox>
              <Checkbox name="explainable" defaultChecked={initial !== null}>
                J’accepte d’expliquer mon code au jury s’il le demande.
              </Checkbox>
              {(error?.field === "solo" || error?.field === "explainable") && <span className="text-sm font-bold text-danger">{error.text}</span>}
            </div>
            {error && !error.field && (
              <Alert tone="danger" role="alert">
                {error.text}
              </Alert>
            )}
          </>
        )}
      </Page>
      <ActionBar>
        {sent ? (
          <ButtonLink href={`/defis/${challengeId}`} size="lg" block>
            Retour au défi
          </ButtonLink>
        ) : (
          <>
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? "Envoi…" : initial ? "Mettre à jour ma solution" : "Soumettre ma solution"}
            </Button>
            <p className="text-center text-xs text-muted">Modifiable jusqu’au {closes}.</p>
          </>
        )}
      </ActionBar>
    </form>
  );
}
