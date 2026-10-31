import type { Metadata } from "next";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Display";
import { AdminActions } from "@/components/features/hackathons/AdminActions";
import { Link } from "@/i18n/navigation";
import { badgedMentors } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { adminOverview, getHackathon } from "@/server/hackathons";
import { AdminNav } from "../AdminNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.admin");
  return { title: t("title"), robots: { index: false } };
}

const TONE = { OPEN: "brand", JURY: "accent", DONE: "success" } as const;

async function Data() {
  const user = await adminUser("/admin/hackathons");
  const [t, format, { hackathons }, mentors] = await Promise.all([getTranslations("hackathons.admin"), getFormatter(), adminOverview(user.id), badgedMentors(user.id)]);
  // Proposals to review first, then by date.
  const rows = [...hackathons].sort((a, b) => Number(a.published) - Number(b.published));
  const juries = await Promise.all(rows.map((h) => getHackathon(user.id, h.id).then((d) => d.jury.map((j) => j.id))));
  return (
    <Page>
      <AdminNav current="/admin/hackathons" />
      <p className="text-sm text-muted">{t("help")}</p>
      <ButtonLink href="/hackathons/organiser" icon="plus" variant="secondary" className="justify-self-start">
        {t("create")}
      </ButtonLink>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((h, i) => (
          <Card key={h.id} className="gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {h.published ? <Badge tone={TONE[h.status]}>{t(`status.${h.status}`)}</Badge> : <Badge tone="accent">{t("toReview")}</Badge>}
              <Link href={`/hackathons/${h.id}`} className="font-extrabold text-ink">
                {h.title}
              </Link>
            </div>
            <p className="text-sm text-muted">
              {t("row", {
                organizer: h.organizerName,
                start: format.dateTime(new Date(h.startsAt), { day: "numeric", month: "short" }),
                end: format.dateTime(new Date(h.endsAt), { day: "numeric", month: "short" }),
                teams: h.teams,
                jury: juries[i].length,
              })}
            </p>
            <AdminActions id={h.id} status={h.status} published={h.published} mentors={mentors} jury={juries[i]} />
            {h.status === "DONE" && (
              <Link href={`/hackathons/${h.id}/resultats`} className="text-sm font-extrabold">
                {t("seeResults")}
              </Link>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}

export default async function AdminHackathonsPage() {
  const t = await getTranslations("hackathons.admin");
  return (
    <>
      <TopBar back="/admin" title={t("title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <Data />
      </Suspense>
    </>
  );
}
