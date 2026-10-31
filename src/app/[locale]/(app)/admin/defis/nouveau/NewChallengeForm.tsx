"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, RadioCard, Select, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

type Senior = { id: string; name: string; city: string };

export function NewChallengeForm({ seniors }: { seniors: Senior[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"CAGNOTTE" | "SPONSORISE" | "LOT">("CAGNOTTE");
  const [jury, setJury] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const closes = String(d.get("closesAt") ?? "");
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/admin/challenges", {
        body: {
          title: String(d.get("title") ?? ""),
          kind,
          level: String(d.get("level") ?? ""),
          stack: String(d.get("stack") ?? ""),
          description: String(d.get("description") ?? ""),
          closesAt: closes ? new Date(closes).toISOString() : "",
          requiresMentoring: d.get("mentoring") === "on",
          prizeLabel: String(d.get("prize") ?? "") || undefined,
          sponsorName: String(d.get("sponsor") ?? "") || undefined,
          sponsorAmount: Number(d.get("amount") || 0) || undefined,
          jurorIds: jury,
        },
      });
      router.replace(`/defis/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "Le défi n’a pas été créé." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/admin/defis" close title="Nouveau défi" />
      <Page narrow className="flex-1">
        <TextField id="title" name="title" label="Titre" maxLength={120} error={fieldError("title")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Type de récompense</legend>
          <RadioCard name="kind" value="CAGNOTTE" checked={kind === "CAGNOTTE"} onChange={() => setKind("CAGNOTTE")} heading="Cagnotte" description="Les sponsors contribuent ; partage 60/30/10." />
          <RadioCard name="kind" value="SPONSORISE" checked={kind === "SPONSORISE"} onChange={() => setKind("SPONSORISE")} heading="Sponsorisé" description="Une entreprise apporte une dotation fixe." />
          <RadioCard name="kind" value="LOT" checked={kind === "LOT"} onChange={() => setKind("LOT")} heading="Lot physique" description="Un objet pour le gagnant." />
        </fieldset>
        {kind === "LOT" && <TextField id="prize" name="prize" label="Lot" placeholder="Un ordinateur portable" error={fieldError("prizeLabel")} />}
        {kind === "SPONSORISE" && (
          <div className="grid grid-cols-2 gap-3">
            <TextField id="sponsor" name="sponsor" label="Sponsor" error={fieldError("sponsorName")} />
            <TextField id="amount" name="amount" type="number" inputMode="numeric" label="Dotation (F CFA)" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select id="level" name="level" label="Niveau" defaultValue="Intermédiaire">
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
          </Select>
          <TextField id="stack" name="stack" label="Technologie" placeholder="Node.js ou Python" error={fieldError("stack")} />
        </div>
        <TextArea id="description" name="description" label="Le défi" rows={5} maxLength={2000} error={fieldError("description")} />
        <TextField id="closesAt" name="closesAt" type="datetime-local" label="Clôture" error={fieldError("closesAt")} />
        <Checkbox name="mentoring" defaultChecked={kind === "CAGNOTTE"}>
          Demande 6 h de mentorat confirmé pour participer
        </Checkbox>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Jury : trois seniors vérifiés ({jury.length} sur 3)</legend>
          {seniors.map((s) => (
            <Checkbox key={s.id} checked={jury.includes(s.id)} disabled={!jury.includes(s.id) && jury.length >= 3} onChange={() => setJury((j) => (j.includes(s.id) ? j.filter((x) => x !== s.id) : [...j, s.id]))}>
              {s.name} {s.city ? `· ${s.city}` : ""}
            </Checkbox>
          ))}
          {fieldError("jurorIds") && <span className="text-sm font-bold text-danger">{fieldError("jurorIds")}</span>}
        </fieldset>
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Création…" : "Créer le défi"}
        </Button>
      </ActionBar>
    </form>
  );
}
