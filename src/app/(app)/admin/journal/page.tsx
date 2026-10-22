import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { agoLabel } from "@/lib/time";
import { auditLog } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";

export const metadata: Metadata = { title: "Journal · Équipe", robots: { index: false } };

const ACTIONS: Record<string, string> = {
  "report:dismiss": "a classé un signalement",
  "report:hide": "a retiré un contenu",
  "report:warn": "a averti un membre",
  "report:suspend": "a suspendu un membre (signalement)",
  "member:suspend": "a suspendu un membre",
  "member:reinstate": "a levé une suspension",
  "senior:verify": "a validé un statut Senior",
  "senior:reject": "a refusé un statut Senior",
  "challenge:create": "a créé un défi",
  "challenge:close": "a clôturé un défi",
  "challenge:publish": "a publié des résultats",
  "payout:sent": "a enregistré un versement",
};

async function Data() {
  const user = await adminUser("/admin/journal");
  const rows = await auditLog(user.id);
  return (
    <Page narrow>
      <AdminNav current="/admin/journal" />
      <p className="text-sm text-muted">Chaque action de l’équipe est enregistrée ici, pour pouvoir en répondre.</p>
      <ul className="m-0 grid list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
        {rows.map((r) => (
          <li key={r.id} className="grid gap-0.5 px-4 py-3 text-sm">
            <span>
              <b>{r.admin}</b> {ACTIONS[r.action] ?? r.action}
              {r.details ? ` : ${r.details}` : ""}
            </span>
            <span className="text-xs text-muted">{agoLabel(r.createdAt)}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-8 text-center text-muted">Aucune action pour l’instant.</p>}
    </Page>
  );
}

export default function JournalPage() {
  return (
    <>
      <TopBar back="/admin" title="Journal" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <Data />
      </Suspense>
    </>
  );
}
