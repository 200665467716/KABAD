import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui/Display";
import { formatFCFA } from "@/lib/format";
import { dashboard } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "./AdminNav";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

function Tile({ label, value, href, alert }: { label: string; value: string; href?: string; alert?: boolean }) {
  const body = (
    <Card className={alert ? "gap-1 border-danger" : "gap-1"}>
      <span className={alert ? "font-display text-[28px] leading-[30px] font-extrabold text-danger tabular" : "font-display text-[28px] leading-[30px] font-extrabold tabular"}>{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </Card>
  );
  return href ? (
    <Link href={href} className="text-ink no-underline">
      {body}
    </Link>
  ) : (
    body
  );
}

async function DashboardData() {
  const user = await adminUser("/admin");
  const [d, t, f] = await Promise.all([dashboard(user.id), getTranslations("admin.dashboard"), getFormatter()]);
  const n = (v: number) => f.number(v);
  return (
    <Page>
      <AdminNav current="/admin" counts={{ "/admin/signalements": d.openReports, "/admin/badges": d.pendingBadges }} />
      <section className="grid gap-3" aria-labelledby="a-todo">
        <h2 id="a-todo" className="font-display text-md font-extrabold uppercase">
          {t("todo")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label={t("pendingBadges")} value={n(d.pendingBadges)} href="/admin/badges" alert={d.pendingBadges > 0} />
          <Tile label={t("openReports")} value={n(d.openReports)} href="/admin/signalements" alert={d.openReports > 0} />
          <Tile label={t("toPublish")} value={n(d.toPublish)} href="/admin/hackathons" alert={d.toPublish > 0} />
          <Tile label={t("juryHackathons")} value={n(d.juryHackathons)} href="/admin/hackathons" />
          <Tile label={t("payouts", { count: d.pendingPayouts.count })} value={formatFCFA(d.pendingPayouts.amount)} href="/admin/versements" />
        </div>
      </section>
      <section className="grid gap-3" aria-labelledby="a-activity">
        <h2 id="a-activity" className="font-display text-md font-extrabold uppercase">
          {t("activity")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label={t("members")} value={n(d.members)} href="/admin/membres" />
          <Tile label={t("newMembers")} value={n(d.newMembers)} />
          <Tile label={t("mentors")} value={n(d.mentors)} />
          <Tile label={t("unverified")} value={n(d.unverified)} />
          <Tile label={t("messages7d")} value={n(d.messages7d)} />
          <Tile label={t("upcomingSessions")} value={n(d.upcomingSessions)} />
          <Tile label={t("heldHours")} value={n(d.heldHours)} />
          <Tile label={t("openHackathons")} value={n(d.openHackathons)} />
          <Tile label={t("riseProjects")} value={n(d.riseProjects)} />
          <Tile label={t("suspended")} value={n(d.suspended)} href="/admin/membres?filtre=suspendus" />
        </div>
      </section>
    </Page>
  );
}

export default async function AdminPage() {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar title={t("title")} subtitle={t("subtitle")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <DashboardData />
      </Suspense>
    </>
  );
}
