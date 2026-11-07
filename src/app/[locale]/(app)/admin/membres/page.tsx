import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { adminMembers } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";
import { MemberAdmin } from "./MemberAdmin";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.members");
  return { title: t("metaTitle"), robots: { index: false } };
}

type Search = { q?: string; filtre?: string };

async function MembersData({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await adminUser("/admin/membres");
  const t = await getTranslations("admin.members");
  const { q, filtre } = await searchParams;
  const filter = filtre === "suspendus" ? "suspended" : "all";
  return (
    <Page>
      <AdminNav current="/admin/membres" />
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} aria-label={t("search")} placeholder={t("search")} className="h-12 min-w-0 flex-1 rounded-md border-2 border-line-strong bg-raised px-3.5" />
        <select name="filtre" defaultValue={filtre ?? ""} aria-label={t("filter")} className="h-12 rounded-md border-2 border-line-strong bg-raised px-2 text-sm">
          <option value="">{t("all")}</option>
          <option value="suspendus">{t("suspendedFilter")}</option>
        </select>
        <button type="submit" className="h-12 rounded-md bg-brand px-5 font-extrabold text-on-brand">
          {t("submit")}
        </button>
      </form>
      <MemberAdmin members={await adminMembers(user.id, q, filter)} meId={user.id} />
    </Page>
  );
}

export default async function AdminMembersPage({ searchParams }: PageProps<"/[locale]/admin/membres">) {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar back="/admin" title={t("members.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <MembersData searchParams={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
