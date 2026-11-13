import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RiseSymbol } from "@/components/features/rise/RiseSymbol";
import { IconButton } from "@/components/ui/Button";
import { Badge, Tag } from "@/components/ui/Display";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { RiseDomain, RiseProjectSummary } from "@/lib/domain-types";
import { RISE_DOMAINS } from "@/lib/schemas";
import { pageUser } from "@/server/page";
import { listProjects } from "@/server/rise";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise");
  return { title: t("metaTitle") };
}

const isDomain = (v: unknown): v is RiseDomain => typeof v === "string" && (RISE_DOMAINS as readonly string[]).includes(v);

/** Screen R1: the projects, live ones first, filtered by African challenge. */
async function Projects({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await pageUser("/rise-up");
  const { defi } = await searchParams;
  const domain = isDomain(defi) ? defi : undefined;
  const [projects, t, format] = await Promise.all([listProjects(user.id, { domain }), getTranslations("rise"), getFormatter()]);
  const chips: Array<{ value?: RiseDomain; label: string }> = [{ label: t("all") }, ...RISE_DOMAINS.filter((d) => d !== "OTHER").map((d) => ({ value: d, label: t(`domain.${d}`) }))];
  const firstLive = projects.findIndex((p) => p.event?.live === true);
  return (
    <>
      <p className="text-[15px] leading-[22px] text-[var(--slate-deep)] dark:text-muted">{t("intro")}</p>
      <nav aria-label={t("filtersLabel")} className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pr-4 lg:mr-0 lg:flex-wrap">
        {chips.map((c) => {
          const on = c.value === domain;
          return (
            <Link
              key={c.label}
              href={c.value ? `/rise-up?defi=${c.value}` : "/rise-up"}
              aria-current={on ? "page" : undefined}
              className={cn("inline-flex h-11 shrink-0 items-center rounded-full border-2 border-line-strong px-4 text-sm font-extrabold whitespace-nowrap no-underline", on ? "bg-ink text-raised" : "bg-raised text-ink")}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>
      {/* R1: the project in direct is the featured card of the screen, with the offset shadow. Only one per screen. */}
      <div className="kb-stagger grid gap-3.5 md:grid-cols-2">
        {projects.map((p, i) => (
          <ProjectCard key={p.id} p={p} featured={i === firstLive} eventLabel={p.event && !p.event.live ? t("eventOn", { date: format.dateTime(new Date(p.event.startsAt), { weekday: "short", hour: "numeric", minute: "2-digit" }) }) : null} t={t} />
        ))}
      </div>
      {projects.length === 0 && <p className="py-8 text-center text-muted">{t("empty")}</p>}
    </>
  );
}

function ProjectCard({ p, eventLabel, featured, t }: { p: RiseProjectSummary; eventLabel: string | null; featured: boolean; t: Awaited<ReturnType<typeof getTranslations<"rise">>> }) {
  const live = p.event?.live === true;
  const meta = [live ? t(`domain.${p.domain}`) : null, t("devs", { count: p.members }), t("countries", { count: p.countries }), !live && p.skills.length ? t("seeking", { skills: p.skills.slice(0, 3).join(", ") }) : null].filter(Boolean).join(" · ");
  return (
    <Link href={`/rise-up/${p.id}`} className={cn("grid content-start gap-2 rounded-lg border-2 border-line-strong p-4 text-ink no-underline transition-[box-shadow,translate] duration-200 ease-kb hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:shadow-none", live ? "bg-accent text-on-accent" : "bg-raised", featured && "shadow-pop")}>
      <div className="flex min-h-10 items-center justify-between gap-2">
        {live ? <Badge tone="live">{t("live")}</Badge> : <span className="flex flex-wrap items-center gap-2"><Tag>{t(`domain.${p.domain}`)}</Tag>{eventLabel && <span className="text-[13px] text-muted">{eventLabel}</span>}</span>}
        {live && <RiseSymbol size={40} className="text-ink" />}
      </div>
      <b className="text-[17px] leading-[22px] font-extrabold">{p.name}</b>
      <span className={cn("text-[13px] leading-[18px]", live ? "font-semibold text-[var(--maize-deep)]" : "text-muted")}>{meta}</span>
    </Link>
  );
}

async function Header() {
  const t = await getTranslations("rise");
  return <TopBar title={t("title")} actions={<IconButton icon="plus" label={t("launch")} href="/rise-up/nouveau" />} />;
}

async function Loading() {
  const t = await getTranslations("rise");
  return (
    <p className="text-muted" role="status">
      {t("loading")}
    </p>
  );
}

export default function RisePage({ searchParams }: PageProps<"/[locale]/rise-up">) {
  return (
    <>
      <Header />
      <Page>
        <Suspense fallback={<Loading />}>
          <Projects searchParams={searchParams} />
        </Suspense>
      </Page>
    </>
  );
}
