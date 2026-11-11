import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge } from "@/components/ui/Display";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { initials } from "@/lib/format";
import { orNotFound } from "@/server/messaging";
import { getMentor } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { SlotPicker } from "../SlotPicker";

/** "UTC+0", "UTC+1": the member's offset, shown next to the slots. */
const zoneLabel = (timeZone: string) => new Intl.DateTimeFormat("fr", { timeZone, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? timeZone;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.profile");
  return { title: t("slotsTitle") };
}

/** Screen M3: the mentor's calendar, at the member's own time. Slots already booked are shown crossed out. */
async function SlotsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/mentors/${id}/creneaux`);
  const mentor = await orNotFound(getMentor(id));
  // A mentor does not book their own slots.
  if (!mentor || mentor.id === user.id) notFound();
  const t = await getTranslations("mentoring.profile");
  return (
    <Page narrow className="gap-4.5">
      <section aria-label={mentor.name} className="flex items-center gap-3">
        <Avatar initials={initials(mentor.name)} tone="brand" />
        <div className="grid min-w-0 flex-1">
          <span className="font-display text-base font-bold">{mentor.name}</span>
          <span className="text-[13px] text-muted">{mentor.domains[0] ? t("session", { domain: mentor.domains[0] }) : t("sessionNoDomain")}</span>
        </div>
        <Badge tone="success" icon="check">
          {t("verifiedShort", { gender: mentor.gender ?? "other" })}
        </Badge>
      </section>
      <SlotPicker mentorId={mentor.id} slots={mentor.slots} taken={mentor.takenSlots} timeZone={user.timeZone} zone={zoneLabel(user.timeZone)} />
    </Page>
  );
}

/** Everything that depends on the address (the mentor) streams in: the shell stays prerendered. */
async function SlotsScreen({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, t] = await Promise.all([params, getTranslations("mentoring")]);
  return (
    <>
      <TopBar back={`/mentorat/mentors/${id}`} title={t("profile.slotsTitle")} />
      <SlotsData params={params} />
    </>
  );
}

export default async function SlotsPage({ params }: PageProps<"/[locale]/mentorat/mentors/[id]/creneaux">) {
  const t = await getTranslations("mentoring");
  return (
    <Suspense
      fallback={
        <>
          <TopBar back="/mentorat" title={t("profile.slotsTitle")} />
          <ScreenSkeleton label={t("loading")} />
        </>
      }
    >
      <SlotsScreen params={params} />
    </Suspense>
  );
}
