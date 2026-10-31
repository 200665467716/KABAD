"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

const THEMES = ["BACKEND", "MOBILE", "CAREER"] as const;

export function CapsuleForm() {
  const router = useRouter();
  const tr = useTranslations("capsules");
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("BACKEND");
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
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : tr("form.error") });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field?.startsWith(f) ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/capsules" close title={tr("form.title")} />
      <Page narrow className="flex-1">
        <TextField id="title" name="title" label={tr("form.titleLabel")} placeholder={tr("form.titlePlaceholder")} error={fieldError("title")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold">{tr("form.theme")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <RadioCard key={t} name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} heading={tr(`theme.${t}`)} className="py-2.5" />
            ))}
          </div>
        </fieldset>
        <TextArea id="body" name="body" label={tr("form.body")} rows={10} value={body} onChange={(e) => setBody(e.target.value)} counter={`${Array.from(body).length} / 6000`} hint={tr("form.bodyHint")} error={fieldError("body")} />
        <TextArea id="code" name="code" label={tr("form.code")} rows={5} className="font-mono" error={fieldError("code")} />
        <TextField id="tags" name="tags" label={tr("form.tags")} placeholder={tr("form.tagsPlaceholder")} error={fieldError("tags")} />
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? tr("form.submitting") : tr("form.submit")}
        </Button>
      </ActionBar>
    </form>
  );
}
