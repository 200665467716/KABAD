import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { choiceLabel } from "@/lib/choice-labels";
import { COUNTRIES } from "@/lib/schemas";
import { popularStacks, searchMembers } from "@/server/members";
import { pageUser } from "@/server/page";
import { MemberList } from "./MemberList";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.members"))("title") };
}

type Search = { q?: string; role?: string; pays?: string; tech?: string; page?: string };

function hrefWith(current: Search, change: Partial<Search>) {
  const next = { ...current, ...change, page: undefined };
  const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
  const s = qs.toString();
  return s ? `/membres?${s}` : "/membres";
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={cn("inline-flex h-11 shrink-0 items-center rounded-full border-2 border-line-strong px-4 text-sm font-extrabold no-underline", on ? "bg-ink text-raised" : "bg-raised text-ink hover:bg-bg")}
    >
      {children}
    </Link>
  );
}

async function MembersData({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await pageUser("/membres");
  const [t, tc, locale] = await Promise.all([getTranslations("profile.members"), getTranslations("common.choices"), getLocale()]);
  const sp = await searchParams;
  const role = sp.role === "senior" ? "SENIOR" : sp.role === "junior" ? "JUNIOR" : undefined;
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);
  const [{ members, hasMore }, stacks] = await Promise.all([searchMembers(user.id, { q: sp.q, role, country: sp.pays, tech: sp.tech, page }), popularStacks()]);

  return (
    <Page>
      <form method="get" action={locale === "en" ? "/en/membres" : "/membres"} role="search" className="grid gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-md border-2 border-line-strong bg-raised px-3 text-muted focus-within:border-focus focus-within:outline-2 focus-within:outline-focus">
            <Icon name="search" size={18} />
            <input name="q" defaultValue={sp.q ?? ""} aria-label={t("search")} placeholder={t("placeholder")} className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-subtle" />
          </label>
          <select name="pays" defaultValue={sp.pays ?? ""} aria-label={t("country")} className="order-last col-span-2 h-11 min-w-0 rounded-md border-2 border-line-strong bg-raised px-2 text-sm sm:order-none sm:col-span-1">
            <option value="">{t("allCountries")}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {choiceLabel(c, tc)}
              </option>
            ))}
          </select>
          {sp.role && <input type="hidden" name="role" value={sp.role} />}
          {sp.tech && <input type="hidden" name="tech" value={sp.tech} />}
          <button type="submit" className="h-11 rounded-md bg-brand px-4 font-extrabold text-on-brand">
            {t("submit")}
          </button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t("role")}>
          <Chip href={hrefWith(sp, { role: undefined })} on={!sp.role}>
            {t("everyone")}
          </Chip>
          <Chip href={hrefWith(sp, { role: "junior" })} on={sp.role === "junior"}>
            {t("devs")}
          </Chip>
          <Chip href={hrefWith(sp, { role: "senior" })} on={sp.role === "senior"}>
            {t("mentors")}
          </Chip>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t("tech")}>
          {stacks.map((t) => (
            <Chip key={t} href={hrefWith(sp, { tech: sp.tech === t ? undefined : t })} on={sp.tech === t}>
              {t}
            </Chip>
          ))}
        </div>
      </form>
      <MemberList members={members} />
      {members.length === 0 && (
        <div className="grid justify-items-center gap-3 py-8 text-center">
          <p className="text-muted">{t("none")}</p>
          <ButtonLink href="/membres" variant="secondary">
            {t("clear")}
          </ButtonLink>
        </div>
      )}
      <nav className="flex justify-between" aria-label={t("pages")}>
        {page > 0 ? <Link href={`${hrefWith(sp, {})}${hrefWith(sp, {}).includes("?") ? "&" : "?"}page=${page - 1}`}>{t("previous")}</Link> : <span />}
        {hasMore && <Link href={`${hrefWith(sp, {})}${hrefWith(sp, {}).includes("?") ? "&" : "?"}page=${page + 1}`}>{t("next")}</Link>}
      </nav>
    </Page>
  );
}

export default async function MembersPage({ searchParams }: PageProps<"/[locale]/membres">) {
  const t = await getTranslations("profile");
  return (
    <>
      <TopBar title={t("members.title")} subtitle={t("members.subtitle")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <MembersData searchParams={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
