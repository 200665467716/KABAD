"use client";

import { useRouter } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button, buttonClass, IconButton } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, Card, Overline, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { TestAppSummary, TestReportView } from "@/lib/domain-types";

const TONE = { SUBMITTED: "accent", VALIDATED: "success", REFUSED: "danger" } as const;

const shotUrl = (reportId: string, i: number, download?: boolean) => `/api/test-reports/${reportId}/captures/${i}${download ? "?telecharger=1" : ""}`;

/**
 * A capture in large, one step after the other, with a button to save it (P3): the author reads the
 * tester's screen without opening a new tab, and keeps it if needed.
 */
function ShotViewer({ reportId, count, index, onChange }: { reportId: string; count: number; index: number | null; onChange: (i: number | null) => void }) {
  const t = useTranslations("tests.review");
  const i = index ?? 0;
  return (
    <Sheet
      open={index !== null}
      onClose={() => onChange(null)}
      title={t("shotTitle", { n: i + 1, count })}
      footer={
        <div className="flex items-center gap-2">
          <IconButton icon="back" label={t("previousShot")} disabled={i === 0} onClick={() => onChange(i - 1)} className="disabled:opacity-40" />
          <IconButton icon="chevron" label={t("nextShot")} disabled={i >= count - 1} onClick={() => onChange(i + 1)} className="disabled:opacity-40" />
          <a href={shotUrl(reportId, i, true)} download className={buttonClass({ variant: "secondary", block: true, className: "min-w-0 flex-1" })}>
            <Icon name="download" size={18} />
            {t("downloadShot")}
          </a>
        </div>
      }
    >
      {index !== null && (
        // eslint-disable-next-line @next/next/no-img-element -- private image served by the API to the owner only
        <img src={shotUrl(reportId, i)} alt={t("openShot", { n: i + 1 })} className="max-h-[62dvh] w-full rounded-md border border-line bg-sunken object-contain" />
      )}
    </Sheet>
  );
}

function ReportCard({ r, now }: { r: TestReportView; now: number }) {
  const router = useRouter();
  const t = useTranslations("tests.review");
  const format = useFormatter();
  const first = r.tester.name.split(" ")[0];
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The capture shown in large, or null (P3).
  const [shot, setShot] = useState<number | null>(null);

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
        <PersonRow avatar={<Avatar initials={initials(r.tester.name)} />} name={r.tester.name} meta={`${r.device} · ${format.relativeTime(new Date(r.createdAt), now)}`} />
        <Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
      </div>
      {/* An app without control questions shows no empty heading. */}
      {r.answers.length > 0 && (
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
      )}
      <div className="grid gap-2">
        <Overline as="h3">{t("shots")}</Overline>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: r.screenshots }, (_, i) => (
            <button key={i} type="button" onClick={() => setShot(i)} aria-label={t("openShot", { n: i + 1 })} className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the API to the owner only */}
              <img src={shotUrl(r.id, i)} alt="" className="h-26 w-16 rounded-md border border-line bg-sunken object-cover transition-transform duration-150 hover:scale-[1.03]" />
            </button>
          ))}
        </div>
        <ShotViewer reportId={r.id} count={r.screenshots} index={shot} onChange={setShot} />
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

/** `now` comes from the server: "il y a 7 secondes" is then the same text on the server and in the browser. */
export function ReportReview({ app, reports, now }: { app: TestAppSummary; reports: TestReportView[]; now: number }) {
  const t = useTranslations("tests.review");
  return (
    <>
      <TopBar back="/tests" title={t("title")} subtitle={t("subtitle", { name: app.name, count: app.reportsCount, toRead: app.toRead })} />
      <Page narrow>
        {reports.length === 0 ? <p className="py-8 text-center text-muted">{t("empty")}</p> : reports.map((r) => <ReportCard key={r.id} r={r} now={now} />)}
      </Page>
    </>
  );
}
