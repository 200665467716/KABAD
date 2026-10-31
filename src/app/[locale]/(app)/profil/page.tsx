import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Card, Tag } from "@/components/ui/Display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/format";
import { myBadgeRequest } from "@/server/badges";
import { listTestApps } from "@/server/community-tests";
import { myEntries } from "@/server/hackathons";
import { myBookings } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { listProjects } from "@/server/rise";
import { SignOutButton } from "./SignOutButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.me"))("title") };
}

function Row({ href, icon, title, text }: { href: string; icon: IconName; title: string; text: string }) {
  return (
    <Link href={href} className="flex min-h-15 items-center gap-3 px-3.5 py-3 text-ink no-underline">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-bg" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-extrabold">{title}</span>
        <span className="truncate text-[13px] text-muted">{text}</span>
      </span>
      <Icon name="chevron" size={18} className="text-subtle" />
    </Link>
  );
}

async function MyProfile() {
  const user = await pageUser("/profil");
  const [t, tl] = await Promise.all([getTranslations("profile.me"), getTranslations("profile.levels")]);
  const [bookings, entries, tests, projects, badge] = await Promise.all([myBookings(user.id), myEntries(user.id), listTestApps(user.id), listProjects(user.id, { mine: true }), myBadgeRequest(user.id)]);
  const mentor = user.seniorVerifiedAt !== null;
  const upcoming = bookings.upcoming.length + bookings.asMentee.filter((b) => b.status === "PENDING").length;
  const entry = entries[0];

  return (
    <Page narrow>
      <Card className="gap-3.5">
        <div className="flex items-center gap-3.5">
          <Avatar initials={initials(user.name)} size="lg" tone="accent" />
          <div className="grid min-w-0 gap-0.5">
            <p className="font-display text-lg font-extrabold">{user.name}</p>
            <p className="truncate text-sm text-muted">{[user.headline, user.city].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {mentor ? <Badge tone="success" icon="check">{t("mentor")}</Badge> : <Badge tone="brand">{tl(user.level)}</Badge>}
          {user.stack.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
        <ButtonLink href="/profil/modifier" variant="secondary" icon="user">
          {t("edit")}
        </ButtonLink>
      </Card>

      <div className="divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
        <Row href="/mentorat" icon="users" title={t("sessions")} text={t("sessionsCount", { count: upcoming })} />
        <Row href={entry ? `/hackathons/${entry.hackathonId}` : "/hackathons"} icon="trophy" title={t("hackathons")} text={entry ? entry.team : t("hackathonsNone")} />
        <Row href="/tests" icon="clipboard" title={t("tests")} text={t("testsCount", { testing: tests.testing.length, mine: tests.mine.length })} />
        <Row href={projects[0] ? `/rise-up/${projects[0].id}` : "/rise-up"} icon="rise" title={t("rise")} text={projects.length === 0 ? t("riseNone") : projects.length === 1 ? projects[0].name : t("riseMore", { name: projects[0].name, count: projects.length - 1 })} />
      </div>

      {mentor ? (
        <div className="overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
          <Row href="/mentorat/disponibilites" icon="clock" title={t("availability")} text={t("availabilityText")} />
        </div>
      ) : (
        <Link href="/mentorat/badge" className="flex items-center gap-3 rounded-lg bg-header px-4 py-3.5 text-on-header no-underline">
          <Icon name="checkCircle" />
          <span className="grid min-w-0 flex-1">
            <span className="font-extrabold">{badge?.status === "PENDING" ? t("badgePending") : t("becomeMentor")}</span>
            <span className="text-[13px] text-on-header-muted">{badge?.status === "PENDING" ? t("badgePendingText") : t("becomeMentorText")}</span>
          </span>
          <Icon name="chevron" size={18} />
        </Link>
      )}

      <div className="divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
        <Row href="/compte" icon="lock" title={t("account")} text={t("accountText")} />
        <Row href={`/profil/${user.id}`} icon="external" title={t("public")} text={user.email} />
        {user.isAdmin && <Row href="/admin" icon="lock" title={t("admin")} text="KABAD" />}
      </div>

      <SignOutButton label={t("signOut")} />
    </Page>
  );
}

/** Screen P1. */
export default async function MyProfilePage() {
  const t = await getTranslations("profile");
  return (
    <>
      <TopBar back="/accueil" title={t("me.title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <MyProfile />
      </Suspense>
    </>
  );
}
