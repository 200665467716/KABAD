"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { ReportContext, ReportDecision } from "@/server/admin";
import { splitResolution } from "@/lib/report-decision";
import { REPORT_REASONS } from "@/lib/schemas";

function ReportCard({ r }: { r: ReportContext }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tr = useTranslations("messaging.report");
  const format = useFormatter();
  const now = useNow();
  const target = r.target;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ReportDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Le motif est enregistré en français (la valeur de REPORT_REASONS) : on affiche son libellé dans la langue du lecteur.
  const reasonIndex = (REPORT_REASONS as readonly string[]).indexOf(r.reason);
  const reason = reasonIndex >= 0 ? tr(`reasons.r${reasonIndex}` as "reasons.r0") : r.reason;
  const resolution = splitResolution(r.resolution ?? "");
  const decisionText = [resolution.decision ? t(`reports.decisions.${resolution.decision}`) : "", resolution.note].filter(Boolean).join(" : ");

  async function decide(decision: ReportDecision) {
    if ((decision === "warn" || decision === "suspend") && note.trim().length < 5) return setError(t("reports.needNote"));
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/admin/reports/${r.id}`, { body: { decision, note: note.trim() || undefined } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
      setBusy(null);
    }
  }

  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="danger">{reason}</Badge>
        <Badge>{t(`reports.target.${r.targetType}`)}</Badge>
        <span className="text-xs text-muted">
          {t.rich("reports.meta", {
            when: format.relativeTime(new Date(r.createdAt), now),
            name: r.reporter.name,
            link: (c) => (
              <Link href={`/profil/${r.reporter.id}`} className="text-muted">
                {c}
              </Link>
            ),
          })}
        </span>
      </div>
      {target && (
        <p className="text-sm">
          {t.rich("reports.targetMember", {
            name: target.name,
            link: (c) => (
              <Link href={`/profil/${target.id}`} className="font-bold">
                {c}
              </Link>
            ),
          })}
          {r.targetReports > 1 && <b className="text-danger"> · {t("reports.targetTotal", { count: r.targetReports })}</b>}
          {target.suspended && <b> · {t("reports.alreadySuspended")}</b>}
        </p>
      )}
      {r.details && <p className="rounded-md bg-sunken px-3 py-2 text-sm">« {r.details} »</p>}
      {r.excerpt.length > 0 && (
        <ul className="m-0 grid list-none gap-1.5 rounded-md border border-line p-3">
          {r.excerpt.map((x, i) => (
            <li key={i} className={x.reported ? "rounded-xs bg-danger-soft px-2 py-1 text-sm" : "px-2 text-sm text-muted"}>
              <b>{x.author}</b> : {x.body}
              {x.hidden && <em> ({t("reports.alreadyHidden")})</em>}
            </li>
          ))}
        </ul>
      )}
      {r.riseProjectId && (
        <Link href={`/rise-up/${r.riseProjectId}`} className="justify-self-start text-sm font-bold">
          {t("reports.seeProject")}
        </Link>
      )}
      {r.status === "REVIEWED" ? (
        <p className="text-sm text-muted">{t("reports.decision", { resolution: decisionText })}</p>
      ) : (
        <>
          <TextField id={`note-${r.id}`} label={t("reports.noteLabel")} value={note} maxLength={250} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("dismiss")}>
              {t("reports.dismiss")}
            </Button>
            {/* A message hidden already (by a lead, or a group's lead) can be shown again by the team only. */}
            {(r.targetType === "MESSAGE" || r.targetType === "RISE_POST") && r.targetHidden ? (
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("restore")}>
                {t("reports.restoreMessage")}
              </Button>
            ) : (
              (r.targetType === "MESSAGE" || r.targetType === "ROOM" || r.targetType === "RISE_POST") && (
                <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("hide")}>
                  {r.targetType === "ROOM" ? t("reports.closeRoom") : t("reports.hideMessage")}
                </Button>
              )
            )}
            {r.target && (
              <>
                <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => decide("warn")}>
                  {t("reports.warn")}
                </Button>
                <Button size="sm" variant="danger" disabled={busy !== null || r.target.suspended} onClick={() => decide("suspend")}>
                  {t("reports.suspend")}
                </Button>
              </>
            )}
          </div>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </>
      )}
    </Card>
  );
}

export function ReportQueue({ reports, status }: { reports: ReportContext[]; status: "OPEN" | "REVIEWED" }) {
  const t = useTranslations("admin.reports");
  return (
    <>
      <div className="flex gap-3 text-sm font-bold">
        <Link href="/admin/signalements" aria-current={status === "OPEN" ? "page" : undefined} className={status === "OPEN" ? "text-ink" : "text-muted"}>
          {t("tabOpen")}
        </Link>
        <Link href="/admin/signalements?vue=traites" aria-current={status === "REVIEWED" ? "page" : undefined} className={status === "REVIEWED" ? "text-ink" : "text-muted"}>
          {t("tabReviewed")}
        </Link>
      </div>
      {reports.length === 0 && <p className="py-8 text-center text-muted">{status === "OPEN" ? t("emptyOpen") : t("emptyReviewed")}</p>}
      {reports.map((r) => (
        <ReportCard key={r.id} r={r} />
      ))}
    </>
  );
}
