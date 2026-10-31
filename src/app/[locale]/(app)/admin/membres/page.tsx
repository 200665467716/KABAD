import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { adminMembers } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";
import { MemberAdmin } from "./MemberAdmin";

export const metadata: Metadata = { title: "Membres · Équipe", robots: { index: false } };

type Search = { q?: string; filtre?: string };

async function MembersData({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await adminUser("/admin/membres");
  const { q, filtre } = await searchParams;
  const filter = filtre === "seniors" ? "pending_seniors" : filtre === "suspendus" ? "suspended" : "all";
  return (
    <Page>
      <AdminNav current="/admin/membres" />
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} aria-label="Nom ou e-mail" placeholder="Nom ou e-mail" className="h-11 min-w-0 flex-1 rounded-md border-2 border-line-strong bg-raised px-3" />
        <select name="filtre" defaultValue={filtre ?? ""} aria-label="Filtre" className="h-11 rounded-md border-2 border-line-strong bg-raised px-2 text-sm">
          <option value="">Tous</option>
          <option value="seniors">Seniors à vérifier</option>
          <option value="suspendus">Suspendus</option>
        </select>
        <button type="submit" className="h-11 rounded-md bg-brand px-4 font-bold text-on-brand">
          Filtrer
        </button>
      </form>
      <MemberAdmin members={await adminMembers(user.id, q, filter)} meId={user.id} />
    </Page>
  );
}

export default function AdminMembersPage({ searchParams }: PageProps<"/[locale]/admin/membres">) {
  return (
    <>
      <TopBar back="/admin" title="Membres" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <MembersData searchParams={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
