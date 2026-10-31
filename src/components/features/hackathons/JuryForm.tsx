"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Meter } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { JURY_CRITERIA, totalScore, type JuryScore } from "@/lib/jury";
import type { JuryItem } from "@/lib/domain-types";

const START: JuryScore = { works: 3, code: 3, tests: 3, explain: 3 };

export function JuryForm({ hackathonId, item }: { hackathonId: string; item: JuryItem }) {
  const t = useTranslations("hackathons.jury");
  const router = useRouter();
  const [score, setScore] = useState<JuryScore>(START);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = item.submission;

  async function save() {
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hackathons/${hackathonId}/scores`, { body: { submissionId: s.id, ...score, comment } });
      setSaved(s.index);
      setScore(START);
      setComment("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!s) {
    return (
      <>
        <TopBar back={`/hackathons/${hackathonId}`} title={t("doneTitle")} subtitle={item.hackathonTitle} />
        <Page narrow className="flex-1">
          <Alert tone="success" title={item.total ? t("doneAll", { count: item.total }) : t("none")}>
            {t("doneText")}
          </Alert>
        </Page>
        <ActionBar>
          <ButtonLink href="/hackathons" size="lg" block>
            {t("back")}
          </ButtonLink>
        </ActionBar>
      </>
    );
  }

  return (
    <>
      <TopBar back={`/hackathons/${hackathonId}`} title={t("solution", { index: s.index })} subtitle={t("anonymous", { title: item.hackathonTitle })} actions={<span className="pr-1 text-sm font-bold text-muted tabular">{item.scored} / {item.total}</span>}>
        <Meter value={item.total ? item.scored / item.total : 0} label={t("progress")} height="h-1" />
      </TopBar>
      <Page narrow className="flex-1">
        <Alert tone="info">{t("privacy")}</Alert>
        <p className="font-display text-lg font-extrabold">{s.projectName}</p>
        <div className="divide-y divide-line rounded-lg border-2 border-line-strong bg-raised">
          <a href={s.repoUrl} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
            <Icon name="code" size={18} className="text-muted" />
            <span className="flex-1 text-sm font-bold">{t("repo")}</span>
            <span className="max-w-[45%] truncate font-mono text-xs text-muted">{s.repoUrl.replace(/^https:\/\//, "")}</span>
          </a>
          {s.demoUrl && (
            <a href={s.demoUrl} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
              <Icon name="link" size={18} className="text-muted" />
              <span className="flex-1 text-sm font-bold">{t("demo")}</span>
              <Icon name="external" size={16} className="text-subtle" />
            </a>
          )}
        </div>
        <section className="grid gap-1">
          <h2 className="text-sm font-bold">{t("explanation")}</h2>
          <p className="rounded-md bg-bg px-3.5 py-3 text-sm whitespace-pre-line">{s.explanation}</p>
        </section>
        {JURY_CRITERIA.map((c) => (
          <fieldset key={c.id} className="grid gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
              <span className="font-bold">{t(`criteria.${c.id}.label`)}</span>
              <span className="text-xs text-muted">{t(`criteria.${c.id}.hint`)}</span>
            </legend>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = score[c.id] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    aria-label={t("mark", { criterion: t(`criteria.${c.id}.label`), n })}
                    onClick={() => setScore((x) => ({ ...x, [c.id]: n }))}
                    className={cn("h-11 rounded-md border text-[15px] font-bold tabular transition-colors", on ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-raised text-ink hover:bg-sunken")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <TextArea id="comment" label={t("comment")} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        <div aria-live="polite">
          {saved !== null && (
            <Alert tone="success" role="status">
              {t("saved", { index: saved })}
            </Alert>
          )}
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Page>
      <ActionBar className="grid-cols-[minmax(0,1fr)_auto] items-center">
        <div className="grid">
          <span className="text-xs text-muted">{t("yourMark")}</span>
          <span className="font-display text-xl font-bold tabular">{totalScore(score)} / 20</span>
        </div>
        <Button onClick={save} disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
      </ActionBar>
    </>
  );
}
