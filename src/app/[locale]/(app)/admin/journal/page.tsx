import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { auditLog } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { splitResolution } from "@/lib/report-decision";
import { AdminNav } from "../AdminNav";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.journal");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Code d’une action → la clé de son libellé dans admin.journal.actions. Un code inconnu a un libellé générique. */
const ACTIONS = {
  "report:dismiss": "reportDismiss",
  "report:hide": "reportHide",
  "report:warn": "reportWarn",
  "report:suspend": "reportSuspend",
  "member:suspend": "memberSuspend",
  "member:reinstate": "memberReinstate",
  "senior:verify": "seniorVerify",
  "senior:reject": "seniorReject",
  "challenge:create": "challengeCreate",
  "challenge:close": "challengeClose",
  "challenge:publish": "challengePublish",
  "payout:sent": "payoutSent",
  "badge:grant": "badgeGrant",
  "badge:refuse": "badgeRefuse",
  "badge:revoke": "badgeRevoke",
  "hackathon:jury": "hackathonJury",
  "hackathon:publish": "hackathonPublish",
  "hackathon:close": "hackathonClose",
  "hackathon:publish_results": "hackathonPublishResults",
} as const;

function actionKey(action: string) {
  return Object.hasOwn(ACTIONS, action) ? ACTIONS[action as keyof typeof ACTIONS] : null;
}

async function Data() {
  const user = await adminUser("/admin/journal");
  const rows = await auditLog(user.id);
  const t = await getTranslations("admin.journal");
  const format = await getFormatter();
  const actionLabel = (action: string) => {
    const key = actionKey(action);
    return key ? t(`actions.${key}`) : t("actions.unknown", { code: action });
  };
  // Les décisions sur un signalement gardaient leur libellé français en tête (« Contenu retiré : … ») : on ne montre que la note.
  const details = (r: (typeof rows)[number]) => (r.details && r.action.startsWith("report:") ? splitResolution(r.details).note : r.details);
  return (
    <Page narrow>
      <AdminNav current="/admin/journal" />
      <p className="text-sm text-muted">{t("intro")}</p>
      <ul className="m-0 grid list-none divide-y divide-line rounded-lg border-2 border-line-strong bg-raised p-0">
        {rows.map((r) => (
          <li key={r.id} className="grid gap-0.5 px-4 py-3 text-sm">
            <span>
              <b>{r.admin}</b> {actionLabel(r.action)}
              {r.target ? ` · ${r.target}` : ""}
              {details(r) ? ` : ${details(r)}` : ""}
            </span>
            <span className="text-xs text-muted">{format.relativeTime(new Date(r.createdAt))}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-8 text-center text-muted">{t("empty")}</p>}
    </Page>
  );
}

export default async function JournalPage() {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar back="/admin" title={t("journal.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <Data />
      </Suspense>
    </>
  );
}
