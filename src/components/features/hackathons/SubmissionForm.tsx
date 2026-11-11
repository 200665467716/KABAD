"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { SUBMISSION_MAX } from "@/lib/schemas";
import type { TeamView } from "@/lib/domain-types";

/** H5: the team's solution, editable until the end of the hackathon. */
export function SubmissionForm({ hackathonId, heading, initial }: { hackathonId: string; heading: string; initial: TeamView["submission"] }) {
  const t = useTranslations("hackathons.submit");
  const router = useRouter();
  const [explain, setExplain] = useState(initial?.explanation ?? "");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const err = (f: string) => (error?.field === f ? error.text : undefined);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hackathons/${hackathonId}/submission`, {
        method: "PUT",
        body: {
          projectName: String(data.get("projectName") ?? ""),
          repoUrl: String(data.get("repoUrl") ?? ""),
          demoUrl: String(data.get("demoUrl") ?? ""),
          explanation: explain,
          teamAgrees: data.get("agree") === "on",
        },
      });
      router.push(`/hackathons/${hackathonId}/equipe`);
      router.refresh();
    } catch (x) {
      setError({ field: x instanceof ApiError ? x.field : undefined, text: x instanceof ApiError ? x.message : t("failed") });
      setBusy(false);
    }
  }

  const fields = ["projectName", "repoUrl", "demoUrl", "explanation"];
  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <Page narrow className="flex-1">
        <div className="grid gap-1">
          <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{heading}</p>
          <h2 className="font-display text-2xl font-extrabold uppercase">{t("heading")}</h2>
        </div>
        <TextField id="projectName" name="projectName" label={t("projectName")} defaultValue={initial?.projectName} maxLength={60} error={err("projectName")} />
        {/* H5: "https://" may be left out, the server adds it; H5e: a private or unknown repository is refused under the field. */}
        <TextField id="repoUrl" name="repoUrl" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} label={t("repo")} placeholder="github.com/[equipe]/[projet]" defaultValue={initial?.repoUrl.replace(/^https:\/\//, "")} error={err("repoUrl")} />
        <TextField id="demoUrl" name="demoUrl" type="url" label={t("demo")} hint={t("optional")} placeholder="https://" defaultValue={initial?.demoUrl ?? ""} error={err("demoUrl")} />
        <TextArea id="explanation" label={t("explanation")} rows={5} value={explain} maxLength={SUBMISSION_MAX} onChange={(e) => setExplain(e.target.value)} counter={`${explain.length} / ${SUBMISSION_MAX}`} error={err("explanation")} />
        <Checkbox name="agree">{t("agree")}</Checkbox>
        {error && !fields.includes(error.field ?? "") && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t("sending") : initial ? t("update") : t("send")}
        </Button>
      </ActionBar>
    </form>
  );
}
