import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Card, Overline, PersonRow, SectionHead } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { DayCount } from "@/lib/daily-counts";
import { initials } from "@/lib/format";
import { dashboard } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "./AdminNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

type T = Awaited<ReturnType<typeof getTranslations<"admin.dashboard">>>;
type F = Awaited<ReturnType<typeof getFormatter>>;

/** One line of the "to handle" card: the count stands out while something waits. */
function TodoRow({ count, label, href, t, f }: { count: number; label: string; href: string; t: T; f: F }) {
  return (
    <li>
      <Link href={href} className="grid min-h-11 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm py-1.5 text-ink no-underline hover:bg-bg">
        <span className={cn("grid h-9 min-w-9 place-items-center rounded-full px-2 font-display text-md font-extrabold tabular", count > 0 ? "bg-danger text-on-danger" : "bg-sunken text-muted")}>{f.number(count)}</span>
        <span className="font-bold">{label}</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          {count === 0 && t("upToDate")}
          <Icon name="chevron" size={16} />
        </span>
      </Link>
    </li>
  );
}

/**
 * Bars of one series, day by day: one colour, the title names it, so no legend. Each day shows its value
 * on hover, and a table gives the same figures to screen readers.
 */
function DayChart({ title, series, week, t, f }: { title: string; series: DayCount[]; week: { current: number; change: number }; t: T; f: F }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  const day = (d: string, long?: boolean) => f.dateTime(new Date(`${d}T12:00:00Z`), long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });
  const label = t("chartLabel", { title, from: day(series[0].day), to: day(series[series.length - 1].day) });
  return (
    <Card className="gap-3">
      <div className="grid gap-0.5">
        <Overline as="h3">{title}</Overline>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <b className="font-display text-[28px] leading-[30px] font-extrabold tabular">{f.number(week.current)}</b>
          <span className="text-sm text-muted">{t("lastWeek")}</span>
        </p>
        <p className="text-sm text-muted">{week.change > 0 ? t("changeUp", { n: week.change }) : week.change < 0 ? t("changeDown", { n: -week.change }) : t("changeSame")}</p>
      </div>
      <figure className="grid gap-1.5">
        <div aria-hidden className="relative flex h-24 items-end gap-0.5 border-b-2 border-line">
          {series.every((d) => d.count === 0) && <span className="absolute inset-0 grid place-items-center text-sm text-muted">{t("chartEmpty")}</span>}
          {series.map((d) => (
            <div key={d.day} title={t("dayValue", { day: day(d.day, true), count: d.count })} className="group flex h-full flex-1 items-end rounded-t-[4px] hover:bg-bg">
              <span className={cn("block w-full rounded-t-[4px] bg-brand group-hover:bg-brand-hover", d.count === 0 && "hidden")} style={{ height: `max(4px, ${(d.count / max) * 100}%)` }} />
            </div>
          ))}
        </div>
        <figcaption className="flex justify-between text-xs text-muted tabular">
          <span>{day(series[0].day)}</span>
          <span className="sr-only">{label}</span>
          <span>{day(series[series.length - 1].day)}</span>
        </figcaption>
        <table className="sr-only">
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t("day")}</th>
              <th scope="col">{t("count")}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((d) => (
              <tr key={d.day}>
                <td>{day(d.day, true)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </Card>
  );
}

/** A module's figures, as label and value lines, with a link to its own page. */
function Module({ title, href, rows, t }: { title: string; href: string; rows: Array<{ label: string; value: string; link?: string }>; t: T }) {
  return (
    <Card className="content-start gap-2">
      <div className="flex items-center justify-between gap-3">
        <Overline as="h3">{title}</Overline>
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold">
          {t("see")}
          <Icon name="chevron" size={16} />
        </Link>
      </div>
      <dl className="grid">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0 first:pt-0">
            <dt className="text-sm text-muted">{r.link ? <Link href={r.link}>{r.label}</Link> : r.label}</dt>
            <dd className="font-display font-extrabold tabular">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3" aria-labelledby={id}>
      <SectionHead id={id} title={title} action={action} />
      {children}
    </section>
  );
}

async function DashboardData() {
  const user = await adminUser("/admin");
  const [d, t, tl, f] = await Promise.all([dashboard(user.id), getTranslations("admin.dashboard"), getTranslations("profile.levels"), getFormatter()]);
  const n = (v: number) => f.number(v);
  const todo = d.pendingBadges + d.openReports + d.toPublish + d.juryHackathons;
  return (
    <Page>
      <AdminNav current="/admin" counts={{ "/admin/signalements": d.openReports, "/admin/badges": d.pendingBadges }} />

      <Card featured className="gap-3">
        <div className="grid gap-1">
          <Overline as="h2" id="a-todo">
            {t("todo")}
          </Overline>
          <p className="font-display text-lg font-extrabold uppercase">{t("todoCount", { count: todo })}</p>
          {todo === 0 && <p className="text-sm text-muted">{t("todoDone")}</p>}
        </div>
        <ul aria-labelledby="a-todo" className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
          <TodoRow count={d.openReports} label={t("openReports")} href="/admin/signalements" t={t} f={f} />
          <TodoRow count={d.pendingBadges} label={t("pendingBadges")} href="/admin/badges" t={t} f={f} />
          <TodoRow count={d.toPublish} label={t("toPublish")} href="/admin/hackathons" t={t} f={f} />
          <TodoRow count={d.juryHackathons} label={t("juryHackathons")} href="/admin/hackathons" t={t} f={f} />
        </ul>
      </Card>

      <Section id="a-activity" title={t("activity")}>
        <div className="grid gap-3 md:grid-cols-2">
          <DayChart title={t("signups")} series={d.signups} week={d.signupsWeek} t={t} f={f} />
          <DayChart title={t("messages")} series={d.messages} week={d.messagesWeek} t={t} f={f} />
        </div>
      </Section>

      <Section id="a-overview" title={t("overview")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Module
            title={t("membersTitle")}
            href="/admin/membres"
            t={t}
            rows={[
              { label: t("members"), value: n(d.members) },
              { label: t("unverified"), value: n(d.unverified) },
              { label: t("suspended"), value: n(d.suspended), link: "/admin/membres?filtre=suspendus" },
            ]}
          />
          <Module
            title={t("mentoringTitle")}
            href="/admin/badges"
            t={t}
            rows={[
              { label: t("mentors"), value: n(d.mentors) },
              { label: t("upcomingSessions"), value: n(d.upcomingSessions) },
              { label: t("heldHours"), value: n(d.heldHours) },
            ]}
          />
          <Module
            title={t("hackathonsTitle")}
            href="/admin/hackathons"
            t={t}
            rows={[
              { label: t("openHackathons"), value: n(d.openHackathons) },
              { label: t("juryHackathons"), value: n(d.juryHackathons) },
              { label: t("toPublish"), value: n(d.toPublish) },
            ]}
          />
          <Module title={t("riseTitle")} href="/rise-up" t={t} rows={[{ label: t("riseProjects"), value: n(d.riseProjects) }]} />
        </div>
      </Section>

      <Section
        id="a-latest"
        title={t("latest")}
        action={
          <Link href="/admin/membres" className="text-sm font-bold">
            {t("allMembers")}
          </Link>
        }
      >
        <Card className="gap-3">
          {d.latest.length === 0 ? (
            <p className="text-sm text-muted">{t("latestEmpty")}</p>
          ) : (
            <ul className="grid gap-3">
              {d.latest.map((m) => (
                <li key={m.id}>
                  <PersonRow
                    avatar={<Avatar initials={initials(m.name)} src={m.photo} verified={m.verified} />}
                    name={<Link href={`/profil/${m.id}`}>{m.name}</Link>}
                    badge={!m.confirmed && <Badge>{t("notConfirmed")}</Badge>}
                    meta={t("joined", { place: [m.city, tl(m.level)].filter(Boolean).join(" · "), date: f.dateTime(new Date(m.createdAt), { day: "numeric", month: "short" }) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>
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
