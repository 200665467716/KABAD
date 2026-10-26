import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui/Display";
import { formatFCFA, formatNumber } from "@/lib/format";
import { salonsEnabled } from "@/lib/features";
import { dashboard } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Équipe KABAD", robots: { index: false } };

function Tile({ label, value, href, alert }: { label: string; value: string | number; href?: string; alert?: boolean }) {
  const body = (
    <Card className={alert ? "gap-1 border-danger" : "gap-1"}>
      <span className={alert ? "font-display text-[28px] leading-8 font-bold text-danger tabular" : "font-display text-[28px] leading-8 font-bold tabular"}>{typeof value === "number" ? formatNumber(value) : value}</span>
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
  const d = await dashboard(user.id);
  return (
    <Page>
      <AdminNav current="/admin" counts={{ "/admin/signalements": d.openReports, "/admin/membres": d.pendingSeniors }} />
      <section className="grid gap-2" aria-labelledby="a-todo">
        <h2 id="a-todo" className="font-display text-lg font-bold">
          À traiter
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="signalements ouverts" value={d.openReports} href="/admin/signalements" alert={d.openReports > 0} />
          <Tile label="seniors à vérifier" value={d.pendingSeniors} href="/admin/membres?filtre=seniors" alert={d.pendingSeniors > 0} />
          <Tile label="défis en jury" value={d.juryChallenges} href="/admin/defis" />
          <Tile label={`versements à faire (${d.pendingPayouts.count})`} value={formatFCFA(d.pendingPayouts.amount)} href="/admin/versements" />
        </div>
      </section>
      <section className="grid gap-2" aria-labelledby="a-activity">
        <h2 id="a-activity" className="font-display text-lg font-bold">
          Activité
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="membres" value={d.members} href="/admin/membres" />
          <Tile label="nouveaux sur 7 jours" value={d.newMembers} />
          <Tile label="seniors vérifiés" value={d.seniors} />
          <Tile label="e-mails non confirmés" value={d.unverified} />
          <Tile label="messages sur 7 jours" value={d.messages7d} />
          <Tile label="binômes actifs" value={d.activePairs} />
          <Tile label="heures de mentorat confirmées" value={d.confirmedHours} />
          <Tile label="défis ouverts" value={d.openChallenges} />
          {salonsEnabled && <Tile label="salons en direct" value={d.liveRooms} />}
          <Tile label="comptes suspendus" value={d.suspended} href="/admin/membres?filtre=suspendus" />
        </div>
      </section>
    </Page>
  );
}

export default function AdminPage() {
  return (
    <>
      <TopBar title="Équipe KABAD" subtitle="Modération, membres, défis et versements" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <DashboardData />
      </Suspense>
    </>
  );
}
