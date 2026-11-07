import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Card, SectionLink } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { HackathonList } from "@/components/features/hackathons/HackathonList";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/format";
import { listHackathons, myEntries, myMissions } from "@/server/hackathons";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.list");
  return { title: t("title") };
}

async function Data() {
  const user = await pageUser("/hackathons");
  const [t, format, hackathons, entries, missions] = await Promise.all([getTranslations("hackathons.list"), getFormatter(), listHackathons(user.id), myEntries(user.id), myMissions(user.id)]);
  const now = readClock();
  const current = entries.find((e) => e.status === "OPEN");
  const proposed = missions.filter((m) => m.status === "PROPOSED");

  return (
    <Page>
      {current && (
        <Link href={`/hackathons/${current.hackathonId}/equipe`} className="flex items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-3.5 text-ink no-underline shadow-pop">
          <Avatar initials={initials(current.team)} square tone="brand" />
          <span className="grid min-w-0 flex-1">
            <b className="truncate">{current.solo ? t("yourEntry") : t("yourTeam", { team: current.team })}</b>
            <span className="truncate text-[13px] text-muted">
              {current.title} · {t("dueIn", { when: format.relativeTime(new Date(current.endsAt), now) })}
            </span>
          </span>
          <Icon name="chevron" size={18} />
        </Link>
      )}

      {proposed.length > 0 && (
        <section aria-labelledby="missions" className="grid gap-3">
          <SectionLink id="missions" title={t("missions")} />
          {proposed.map((m) => (
            <Card key={m.id} interactive className="gap-2">
              <Link href={`/hackathons/missions/${m.id}`} className="grid gap-1 text-ink no-underline">
                <Badge tone="accent">{t("missionPaid")}</Badge>
                <b>{m.hackathon.title}</b>
                <span className="text-[13px] text-muted">{t("missionFrom", { organizer: m.hackathon.organizerName })}</span>
              </Link>
            </Card>
          ))}
        </section>
      )}

      <HackathonList hackathons={hackathons} now={now} />

      <Card className="gap-3">
        <p className="font-extrabold">{t("organizeTitle")}</p>
        <p className="text-sm text-muted">{t("organizeText")}</p>
        <ButtonLink href="/hackathons/organiser" variant="ink" icon="plus" className="justify-self-start">
          {t("organize")}
        </ButtonLink>
      </Card>
    </Page>
  );
}

export default async function HackathonsPage() {
  const t = await getTranslations("hackathons.list");
  return (
    <>
      <TopBar title={t("title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <Data />
      </Suspense>
    </>
  );
}
