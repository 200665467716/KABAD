"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { RiseDomain } from "@/lib/domain-types";
import { RISE_DOMAINS } from "@/lib/schemas";

export function ProjectForm() {
  const t = useTranslations("rise");
  const router = useRouter();
  const [domain, setDomain] = useState<RiseDomain>("WATER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/rise", {
        body: {
          name: String(data.get("name") ?? ""),
          domain,
          summary: String(data.get("summary") ?? ""),
          problem: String(data.get("problem") ?? ""),
          skills: String(data.get("skills") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          skill: String(data.get("skill") ?? "").trim() || undefined,
        },
      });
      router.replace(`/rise-up/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("create.error") });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/rise-up" close title={t("create.title")} />
      <Page narrow className="flex-1">
        <h2 className="font-display text-2xl font-extrabold uppercase">{t("create.heading")}</h2>
        <TextField id="name" name="name" label={t("create.name")} placeholder={t("create.namePlaceholder")} maxLength={80} error={fieldError("name")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("create.domain")}</legend>
          <div className="flex flex-wrap gap-2">
            {RISE_DOMAINS.map((d) => (
              <ToggleChip key={d} pressed={domain === d} onClick={() => setDomain(d)}>
                {t(`domain.${d}`)}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <TextField id="summary" name="summary" label={t("create.summary")} maxLength={200} error={fieldError("summary")} />
        <TextArea id="problem" name="problem" label={t("create.problem")} rows={5} maxLength={1500} placeholder={t("create.problemPlaceholder")} error={fieldError("problem")} />
        <TextField id="skills" name="skills" label={t("create.skills")} placeholder={t("create.skillsPlaceholder")} hint={t("create.skillsHint")} error={fieldError("skills")} />
        <TextField id="skill" name="skill" label={t("create.mySkill")} maxLength={30} />
        {error && !["name", "summary", "problem", "skills"].includes(error.field ?? "") && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t("create.submitting") : t("create.submit")}
        </Button>
      </ActionBar>
    </form>
  );
}
