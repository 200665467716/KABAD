"use client";

import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

const THEMES = [
  { value: "BACKEND", label: "Back-end" },
  { value: "MOBILE", label: "Mobile" },
  { value: "CAREER", label: "Carrière" },
] as const;

export function CapsuleForm() {
  const router = useRouter();
  const [theme, setTheme] = useState<(typeof THEMES)[number]["value"]>("BACKEND");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const tags = String(data.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/capsules", { body: { title: String(data.get("title") ?? ""), theme, body, code: String(data.get("code") ?? ""), tags } });
      router.replace(`/capsules/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "La capsule n’a pas été publiée. Réessayez." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field?.startsWith(f) ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/capsules" close title="Publier une capsule" />
      <Page narrow className="flex-1">
        <TextField id="title" name="title" label="Titre" placeholder="Ce que vous avez appris, en une phrase" error={fieldError("title")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">Thème</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <RadioCard key={t.value} name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} heading={t.label} className="py-2.5" />
            ))}
          </div>
        </fieldset>
        <TextArea id="body" name="body" label="Votre capsule" rows={10} value={body} onChange={(e) => setBody(e.target.value)} counter={`${Array.from(body).length} / 6000`} hint="Séparez les paragraphes par une ligne vide." error={fieldError("body")} />
        <TextArea id="code" name="code" label="Extrait de code (facultatif)" rows={5} className="font-mono" error={fieldError("code")} />
        <TextField id="tags" name="tags" label="Mots-clés (facultatif, séparés par des virgules)" placeholder="Paiement, Tests" error={fieldError("tags")} />
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Publication…" : "Publier la capsule"}
        </Button>
      </ActionBar>
    </form>
  );
}
