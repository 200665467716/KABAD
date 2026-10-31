import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/shell/TopBar";
import { InstructorPicker } from "@/components/features/hackathons/InstructorPicker";
import { getHackathon, missionsFor } from "@/server/hackathons";
import { listMentors } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.instructors");
  return { title: t("title") };
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/instructeurs`);
  const h = await orNotFound(getHackathon(user.id, id));
  if (!h || !h.canEdit) notFound();
  const [t, mentors, missions] = await Promise.all([getTranslations("hackathons.instructors"), listMentors({ excludeId: user.id }), missionsFor(user.id, id)]);
  const juryIds = new Set(h.jury.map((j) => j.id));
  return (
    <>
      <TopBar back={`/hackathons/${id}`} title={t("title")} subtitle={h.title} />
      <InstructorPicker
        hackathonId={id}
        missionText={h.missionText}
        fee={h.instructorFee}
        mentors={mentors.filter((m) => !juryIds.has(m.id))}
        asked={Object.fromEntries(missions.map((m) => [m.mentorId, m.status]))}
      />
    </>
  );
}

export default async function InstructorsPage({ params }: PageProps<"/[locale]/hackathons/[id]/instructeurs">) {
  const t = await getTranslations("hackathons.instructors");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <Data params={params} />
    </Suspense>
  );
}
