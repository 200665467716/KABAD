"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { localInputValue } from "@/lib/time";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

export function NewRoomForm({ verified }: { verified: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [defaultStart] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(19, 0, 0, 0);
    return localInputValue(d);
  });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const when = String(d.get("startsAt") ?? "");
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/rooms", {
        body: { title: String(d.get("title") ?? ""), description: String(d.get("description") ?? ""), now, ...(now || !when ? {} : { startsAt: new Date(when).toISOString() }) },
      });
      router.replace(`/salons/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "Le salon n’a pas été créé." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/salons" close title="Créer un salon" />
      <Page narrow className="flex-1">
        {!verified && <Alert tone="info">Confirmez d’abord votre adresse e-mail pour animer un salon.</Alert>}
        <TextField id="title" name="title" label="Sujet" placeholder="Par exemple : réussir son premier entretien tech" maxLength={100} error={fieldError("title")} />
        <TextArea id="description" name="description" label="En une ou deux phrases" rows={3} maxLength={600} error={fieldError("description")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Quand ?</legend>
          <RadioCard name="when" value="now" checked={now} onChange={() => setNow(true)} heading="Maintenant" description="Le salon est en direct dès sa création." />
          <RadioCard name="when" value="later" checked={!now} onChange={() => setNow(false)} heading="Programmer" description="Les membres peuvent demander un rappel." />
        </fieldset>
        {!now && <TextField id="startsAt" name="startsAt" type="datetime-local" label="Date et heure" defaultValue={defaultStart} error={fieldError("startsAt")} />}
        <p className="text-xs text-muted">Vous êtes l’hôte : vous invitez des membres sur scène, vous pouvez retirer quelqu’un, et vous terminez le salon. Respectez les règles de la communauté : les salons peuvent être signalés.</p>
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy || !verified}>
          {busy ? "Création…" : now ? "Ouvrir le salon" : "Programmer le salon"}
        </Button>
      </ActionBar>
    </form>
  );
}
