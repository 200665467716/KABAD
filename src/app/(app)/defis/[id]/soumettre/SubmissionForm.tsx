"use client";

import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, Select, TextArea, TextField } from "@/components/ui/Field";

const MAX = 800;
const OPERATORS = ["Moov Money", "MTN MoMo", "Orange Money", "Wave", "Airtel Money"];

export function SubmissionForm({ challengeId, title, closes, hasCash }: { challengeId: string; title: string; closes: string; hasCash: boolean }) {
  const [explain, setExplain] = useState(
    "Chaque webhook est enregistré avec son identifiant avant traitement : un doublon est ignoré. La signature est vérifiée en premier. 23 tests couvrent les cas d’échec.",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!/^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[\w.-]+\/[\w.-]+/.test(String(data.get("repo") ?? ""))) next.repo = "Indiquez l’adresse d’un dépôt public GitHub, GitLab ou Codeberg.";
    if (explain.trim().length < 40) next.explain = "Expliquez vos choix en quelques phrases (40 caractères au moins).";
    if (hasCash && !/^\+?[\d\s]{8,}$/.test(String(data.get("phone") ?? ""))) next.phone = "Indiquez le numéro Mobile Money qui recevra votre gain.";
    if (!data.get("solo") || !data.get("explainable")) next.terms = "Cochez les deux engagements pour soumettre.";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  }

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
            <TextField id="repo" name="repo" type="url" label="Lien du dépôt public" defaultValue="https://github.com/kmensah/momo-api" inputClassName="font-mono text-sm" error={errors.repo} hint="Le jury lit le code et lance les tests." />
            <TextField id="demo" name="demo" type="url" label="Démo en ligne (facultatif)" placeholder="https://" inputClassName="font-mono text-sm" />
            <TextArea id="explain" name="explain" label="Expliquez vos choix au jury" rows={5} value={explain} maxLength={MAX} onChange={(e) => setExplain(e.target.value)} counter={`${Array.from(explain).length} / ${MAX}`} error={errors.explain} />
            {hasCash && (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-bold">Pour recevoir votre gain</legend>
                <div className="grid grid-cols-[136px_minmax(0,1fr)] gap-2">
                  <Select id="operator" name="operator" label={<span className="sr-only">Opérateur</span>} defaultValue="Moov Money">
                    {OPERATORS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                  <TextField id="phone" name="phone" type="tel" label={<span className="sr-only">Numéro Mobile Money</span>} defaultValue="+228 96 12 34 56" inputClassName="tabular" error={errors.phone} />
                </div>
              </fieldset>
            )}
            <div className="grid gap-2 rounded-md bg-sunken px-3.5 py-3">
              <Checkbox name="solo" defaultChecked>
                J’ai écrit ce code seul. L’aide de mon mentor porte sur l’apprentissage, pas sur la solution.
              </Checkbox>
              <Checkbox name="explainable" defaultChecked>
                J’accepte d’expliquer mon code au jury s’il le demande.
              </Checkbox>
              {errors.terms && <span className="text-sm font-bold text-danger">{errors.terms}</span>}
            </div>
          </>
        )}
      </Page>
      <ActionBar>
        {sent ? (
          <ButtonLink href="/defis" size="lg" block>
            Retour aux défis
          </ButtonLink>
        ) : (
          <>
            <Button type="submit" size="lg" block>
              Soumettre ma solution
            </Button>
            <p className="text-center text-xs text-muted">Modifiable jusqu’au {closes}.</p>
          </>
        )}
      </ActionBar>
    </form>
  );
}
