"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { choiceLabel } from "@/lib/choice-labels";
import { api, ApiError } from "@/lib/api";
import { GOALS, TECH_CHOICES } from "@/lib/schemas";

type Goal = (typeof GOALS)[number];
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function InterestsStep({ initial }: { initial: { stack: string[]; goals: string[] } }) {
  const t = useTranslations("auth.interests");
  const tg = useTranslations("auth.goals");
  const tc = useTranslations("common.choices");
  const router = useRouter();
  // Technologies added later from the profile stay selected even if they are not in the list.
  const choices = [...new Set([...TECH_CHOICES, ...initial.stack])];
  const [stack, setStack] = useState<string[]>(initial.stack);
  const [goals, setGoals] = useState<Goal[]>(initial.goals.filter((g): g is Goal => (GOALS as readonly string[]).includes(g)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "PATCH", body: { stack, goals } });
      router.push("/inscription/recommandations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      back="/inscription/profil"
      heading={t("heading")}
      step={4}
      title={t("title")}
      lead={t("lead")}
      footer={
        <Button size="lg" block disabled={busy} onClick={submit}>
          {busy ? t("busy") : t("submit")}
        </Button>
      }
    >
      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 flex w-full items-baseline justify-between p-0">
          <span className="text-sm font-extrabold">{t("techs")}</span>
          <span className="text-[13px] font-bold text-muted" aria-live="polite">
            {t("count", { count: stack.length })}
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <ToggleChip key={c} pressed={stack.includes(c)} onClick={() => setStack((s) => toggle(s, c))}>
              {choiceLabel(c, tc)}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-sm font-extrabold">{t("goals")}</legend>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <ToggleChip key={g} pressed={goals.includes(g)} onClick={() => setGoals((s) => toggle(s, g))}>
              {tg(g)}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </AuthFrame>
  );
}
