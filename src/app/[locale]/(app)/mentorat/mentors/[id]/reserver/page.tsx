import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Display";
import { BookingSummary } from "@/components/features/mentoring/BookingSummary";
import { orNotFound } from "@/server/messaging";
import { getMentor } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { BookingForm } from "./BookingForm";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.book");
  return { title: t("title") };
}

async function BookData({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creneau?: string }> }) {
  const [{ id }, { creneau }] = await Promise.all([params, searchParams]);
  const user = await pageUser(`/mentorat/mentors/${id}`);
  const mentor = await orNotFound(getMentor(id));
  if (!mentor || mentor.id === user.id) notFound();
  const t = await getTranslations("mentoring.book");
  // The slot comes from the address: it must still be one of the mentor's free slots.
  const slot = mentor.slots.find((s) => creneau && new Date(s).getTime() === new Date(creneau).getTime());
  if (!slot) {
    return (
      <Page narrow>
        <p className="rounded-action bg-bg px-4 py-6 text-center text-muted">{t("slotGone")}</p>
        <ButtonLink href={`/mentorat/mentors/${mentor.id}/creneaux`} variant="secondary" block>
          {t("backToSlots")}
        </ButtonLink>
      </Page>
    );
  }
  return (
    <>
      <Page narrow className="gap-4.5">
        <Card featured>
          <BookingSummary startsAt={slot} minutes={30} otherName={mentor.name} timeZone={user.timeZone} />
        </Card>
      </Page>
      <BookingForm mentorId={mentor.id} mentorName={mentor.name.split(" ")[0]} startsAt={slot} />
    </>
  );
}

/** Everything that depends on the address (mentor, slot) streams in: the shell stays prerendered. */
async function BookScreen({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creneau?: string }> }) {
  const [{ id }, t] = await Promise.all([params, getTranslations("mentoring")]);
  return (
    <>
      <TopBar back={`/mentorat/mentors/${id}/creneaux`} title={t("book.title")} />
      <BookData params={params} searchParams={searchParams} />
    </>
  );
}

export default async function BookPage({ params, searchParams }: PageProps<"/[locale]/mentorat/mentors/[id]/reserver">) {
  const t = await getTranslations("mentoring");
  return (
    <Suspense
      fallback={
        <>
          <TopBar back="/mentorat" title={t("book.title")} />
          <ScreenSkeleton label={t("loading")} />
        </>
      }
    >
      <BookScreen params={params} searchParams={searchParams as Promise<{ creneau?: string }>} />
    </Suspense>
  );
}
