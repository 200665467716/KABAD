import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Overline, TagList } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import { orNotFound } from "@/server/messaging";
import { getMentor } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { SlotPicker } from "./SlotPicker";

/** "UTC+0", "UTC+1": the member's offset, shown next to the slots. */
const zoneLabel = (timeZone: string) => new Intl.DateTimeFormat("fr", { timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? timeZone;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.profile");
  return { title: t("title") };
}

async function MentorData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/mentors/${id}`);
  const mentor = await orNotFound(getMentor(id));
  if (!mentor) notFound();
  const t = await getTranslations("mentoring.profile");
  const self = mentor.id === user.id;
  return (
    <>
      <Page narrow className="gap-4.5">
        <section aria-label={mentor.name} className="flex items-center gap-3">
          <Avatar initials={initials(mentor.name)} size="lg" tone="brand" />
          <div className="grid min-w-0 flex-1">
            <span className="font-display text-base font-bold">{mentor.name}</span>
            <span className="text-[13px] text-muted">{mentor.domains[0] ? t("session", { domain: mentor.domains[0] }) : t("sessionNoDomain")}</span>
            <span className="text-xs font-extrabold text-brand-text">{t("sessionsHeld", { count: mentor.sessionsHeld })}</span>
          </div>
          <Badge tone="success" icon="check">
            {t("verified")}
          </Badge>
        </section>
        {(mentor.bio || mentor.topics) && (
          <section className="grid gap-2">
            {mentor.bio && <p className="text-sm">{mentor.bio}</p>}
            {mentor.topics && (
              <>
                <Overline>{t("about")}</Overline>
                <p className="text-sm text-muted">{mentor.topics}</p>
              </>
            )}
            <TagList items={mentor.technologies} />
          </section>
        )}
        {self && <p className="rounded-action bg-brand-wash px-4 py-3 text-sm">{t("self")}</p>}
        {!self && <SlotPicker mentorId={mentor.id} slots={mentor.slots} timeZone={user.timeZone} zone={zoneLabel(user.timeZone)} />}
      </Page>
    </>
  );
}

export default async function MentorPage({ params }: PageProps<"/[locale]/mentorat/mentors/[id]">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("profile.title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <MentorData params={params} />
      </Suspense>
    </>
  );
}
