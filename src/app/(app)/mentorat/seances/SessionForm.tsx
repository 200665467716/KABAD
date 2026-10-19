"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { SessionView } from "@/lib/domain-types";
import { localInputValue } from "../MentoringActions";

const DURATIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

/** Notes a new session, or corrects one that both members have not confirmed yet. */
export function SessionForm({ pairId, project, session, onCancel }: { pairId: string; project: string; session?: SessionView; onCancel?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const when = String(data.get("startsAt") ?? "");
    const body = {
      pairId,
      startsAt: when ? new Date(when).toISOString() : "",
      minutes: Number(data.get("minutes")),
      topic: String(data.get("topic") ?? ""),
      done: String(data.get("done") ?? ""),
      next: String(data.get("next") ?? ""),
    };
    setBusy(true);
    setError(null);
    try {
      if (session) {
        await api(`/api/mentoring/sessions/${session.id}`, { method: "PUT", body });
        onCancel?.();
        router.refresh();
      } else {
        const { id } = await api<{ id: string }>("/api/mentoring/sessions", { body });
        router.replace(`/mentorat/seances/${id}`);
      }
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "La séance n’a pas été enregistrée. Réessayez." });
      setBusy(false);
    }
  }

  const start = session ? new Date(session.startsAt) : new Date(Math.floor(Date.now() / 900_000) * 900_000 - 3600_000);
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={session ? undefined : "/mentorat"} close title={session ? "Corriger la séance" : "Noter une séance"} subtitle={project} />
      <Page narrow className="flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-3">
          <TextField id="startsAt" name="startsAt" type="datetime-local" label="Début" defaultValue={localInputValue(start)} error={fieldError("startsAt")} />
          <Select id="minutes" name="minutes" label="Durée" defaultValue={String(session?.minutes ?? 90)}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </Select>
        </div>
        <TextField id="topic" name="topic" label="Sujet" defaultValue={session?.topic} placeholder="Par exemple : webhooks idempotents" error={fieldError("topic")} />
        <TextArea id="done" name="done" label="Ce que vous avez fait" rows={4} defaultValue={session?.done} error={fieldError("done")} />
        <TextArea id="next" name="next" label="Prochaine étape" rows={2} defaultValue={session?.next} error={fieldError("next")} />
        <p className="text-xs text-muted">Vous confirmez la séance en la notant. Elle compte quand l’autre membre du binôme l’a confirmée aussi.</p>
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar className={session ? "grid-cols-[auto_minmax(0,1fr)]" : undefined}>
        {session && (
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Enregistrement…" : session ? "Enregistrer la correction" : "Enregistrer la séance"}
        </Button>
      </ActionBar>
    </form>
  );
}
