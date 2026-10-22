import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { adminUser } from "@/server/admin-page";
import { adminOverview } from "@/server/challenges";
import { AdminNav } from "../AdminNav";
import { PayoutList } from "./PayoutList";

export const metadata: Metadata = { title: "Versements · Équipe", robots: { index: false } };

async function Data() {
  const user = await adminUser("/admin/versements");
  const { payouts } = await adminOverview(user.id);
  return (
    <Page narrow>
      <AdminNav current="/admin/versements" />
      <p className="text-sm text-muted">Envoyez chaque somme par Mobile Money, puis indiquez la référence du transfert. Un versement n’est possible qu’après les 48 h de contestation.</p>
      <PayoutList payouts={payouts} />
    </Page>
  );
}

export default function PayoutsPage() {
  return (
    <>
      <TopBar back="/admin" title="Versements" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <Data />
      </Suspense>
    </>
  );
}
