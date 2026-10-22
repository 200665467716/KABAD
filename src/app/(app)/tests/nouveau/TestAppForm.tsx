"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, Select, TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";

type Question = { q: string; options: string; answer: string };
const emptyQuestion = (): Question => ({ q: "", options: "", answer: "" });

export function TestAppForm() {
  const router = useRouter();
  const [platform, setPlatform] = useState<"WEB" | "ANDROID">("WEB");
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/tests", {
        body: {
          name: String(data.get("name") ?? ""),
          platform,
          url: String(data.get("url") ?? "").trim(),
          minutes: Number(data.get("minutes")),
          slots: Number(data.get("slots")),
          pitch: String(data.get("pitch") ?? ""),
          task: String(data.get("task") ?? ""),
          steps: steps.map((s) => s.trim()).filter(Boolean),
          questions: questions.map((q) => {
            const options = q.options
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean);
            return { q: q.q, answer: q.answer, ...(options.length ? { options } : {}) };
          }),
        },
      });
      router.replace(`/tests/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "L’application n’a pas été publiée. Réessayez." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/tests" close title="Faire tester mon app" />
      <Page narrow className="flex-1">
        <TextField id="name" name="name" label="Nom de l’application" maxLength={40} error={fieldError("name")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Plateforme</legend>
          <div className="grid grid-cols-2 gap-2">
            <RadioCard name="platform" value="WEB" checked={platform === "WEB"} onChange={() => setPlatform("WEB")} heading="Web" className="py-2.5" />
            <RadioCard name="platform" value="ANDROID" checked={platform === "ANDROID"} onChange={() => setPlatform("ANDROID")} heading="Android" className="py-2.5" />
          </div>
        </fieldset>
        <TextField id="url" name="url" type="url" label={platform === "WEB" ? "Adresse de l’application" : "Lien de téléchargement (APK ou Play Store)"} placeholder="https://" inputClassName="font-mono text-sm" error={fieldError("url")} />
        <div className="grid grid-cols-2 gap-3">
          <Select id="minutes" name="minutes" label="Durée du test" defaultValue="15">
            {[5, 10, 15, 20, 30].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
          <TextField id="slots" name="slots" type="number" inputMode="numeric" min={1} max={50} label="Testeurs voulus" defaultValue="10" error={fieldError("slots")} />
        </div>
        <TextArea id="pitch" name="pitch" label="Présentez l’application" rows={3} maxLength={500} hint="À qui elle sert, ce que vous voulez apprendre de ce test." error={fieldError("pitch")} />
        <TextField id="task" name="task" label="La tâche à accomplir" maxLength={200} placeholder="Par exemple : passer une commande jusqu’au paiement" error={fieldError("task")} />

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Le scénario, étape par étape</legend>
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <TextField id={`step-${i}`} label={`Étape ${i + 1}`} value={s} maxLength={200} onChange={(e) => setSteps((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label={`Retirer l’étape ${i + 1}`} className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken">
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          ))}
          {steps.length < 5 && (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setSteps((x) => [...x, ""])} className="justify-self-start">
              Ajouter une étape
            </Button>
          )}
          <p className="text-xs text-muted">Le testeur envoie une capture d’écran par étape.</p>
          {fieldError("steps") && <span className="text-sm font-bold text-danger">{fieldError("steps")}</span>}
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-bold">Questions de contrôle</legend>
          <p className="text-xs text-muted">Une question sur ce que seul quelqu’un qui a vraiment testé peut savoir. Avec des choix, la bonne réponse doit en faire partie.</p>
          {questions.map((q, i) => (
            <div key={i} className="grid gap-2 rounded-md bg-sunken p-3">
              <TextField id={`q-${i}`} label={`Question ${i + 1}`} value={q.q} maxLength={160} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} />
              <TextArea id={`opts-${i}`} label="Choix proposés (facultatif, un par ligne)" rows={3} value={q.options} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, options: e.target.value } : y)))} />
              <TextField id={`ans-${i}`} label="Bonne réponse" value={q.answer} maxLength={60} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, answer: e.target.value } : y)))} />
              {questions.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setQuestions((x) => x.filter((_, j) => j !== i))} className="justify-self-start">
                  Retirer cette question
                </Button>
              )}
            </div>
          ))}
          {questions.length < 3 && (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setQuestions((x) => [...x, emptyQuestion()])} className="justify-self-start">
              Ajouter une question
            </Button>
          )}
        </fieldset>
        {error && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Publication…" : "Publier pour la communauté"}
        </Button>
      </ActionBar>
    </form>
  );
}
