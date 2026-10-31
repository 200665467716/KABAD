"use client";

import { useRouter } from "@/i18n/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { TestAppSummary, TestReportView } from "@/lib/domain-types";

const TONE = { SUBMITTED: "accent", VALIDATED: "success", REFUSED: "danger" } as const;

function ReportCard({ r }: { r: TestReportView }) {
  const router = useRouter();
  const t = useTranslations("tests.review");
  const format = useFormatter();
  const now = useNow();
  const first = r.tester.name.split(" ")[0];
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(validate: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/test-reports/${r.id}`, { body: validate ? { validate: true } : { validate: false, reason } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <PersonRow avatar={<Avatar initials={initials(r.tester.name)} tone="accent" />} name={r.tester.name} meta={`${r.device} · ${format.relativeTime(new Date(r.createdAt), now)}`} />
        <Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
      </div>
      <div className="grid gap-2">
        <Overline as="h3">{t("questions")}</Overline>
        {r.answers.map((a) => (
          <div key={a.question} className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5">
            <Icon name={a.correct ? "checkCircle" : "info"} size={20} className={a.correct ? "text-success" : "text-danger"} strokeWidth={2} />
            <span className="grid">
              <span className="text-sm text-muted">{a.question}</span>
              <span className="text-sm font-bold">
                {a.answer} · {a.correct ? t("correct") : t("unexpected")}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Overline as="h3">{t("shots")}</Overline>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: r.screenshots }, (_, i) => (
            <a key={i} href={`/api/test-reports/${r.id}/captures/${i}`} target="_blank" rel="noreferrer" aria-label={t("openShot", { n: i + 1 })}>
              {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the API to the owner only */}
              <img src={`/api/test-reports/${r.id}/captures/${i}`} alt="" className="h-26 w-16 rounded-md border border-line bg-sunken object-cover" />
            </a>
          ))}
        </div>
      </div>
      {r.remarks && (
        <div className="grid gap-2">
          <Overline as="h3">{t("remarks")}</Overline>
          <p className="rounded-md bg-sunken px-3.5 py-3 text-sm whitespace-pre-line">{r.remarks}</p>
        </div>
      )}
      {r.status === "REFUSED" && r.refusalReason && <p className="text-sm text-muted">{t("refusalReason", { reason: r.refusalReason })}</p>}
      {r.status === "SUBMITTED" &&
        (refusing ? (
          <div className="grid gap-2">
            <TextArea id={`refus-${r.id}`} label={t("refuseLabel")} rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} hint={t("refuseHint", { name: first })} />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button variant="secondary" onClick={() => setRefusing(false)} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button variant="danger" onClick={() => review(false)} disabled={busy}>
                {t("confirmRefuse")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Button variant="secondary" onClick={() => setRefusing(true)} disabled={busy}>
              {t("refuse")}
            </Button>
            <Button variant="success" onClick={() => review(true)} disabled={busy} aria-label={t("validateLabel", { name: r.tester.name })}>
              {t("validate")}
            </Button>
          </div>
        ))}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </Card>
  );
}

export function ReportReview({ app, reports }: { app: TestAppSummary; reports: TestReportView[] }) {
  const t = useTranslations("tests.review");
  return (
    <>
      <TopBar back="/tests" title={t("title")} subtitle={t("subtitle", { name: app.name, count: app.reportsCount, toRead: app.toRead })} />
      <Page narrow>
        {reports.length === 0 ? <p className="py-8 text-center text-muted">{t("empty")}</p> : reports.map((r) => <ReportCard key={r.id} r={r} />)}
      </Page>
    </>
  );
}
