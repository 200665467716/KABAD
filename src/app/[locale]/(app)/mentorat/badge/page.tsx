import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Overline, Tag } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { MentorCard } from "@/components/features/mentoring/MentorCard";
import type { BadgeRequestView } from "@/lib/domain-types";
import { myBadgeRequest } from "@/server/badges";
import { getMentor } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { BadgeForm } from "./BadgeForm";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.badge");
  return { title: t("metaTitle") };
}

function Hero({ icon, title, text, tone }: { icon: "check" | "clock" | "info"; title: string; text: string; tone: "success" | "brand" | "neutral" }) {
  const bg = tone === "success" ? "bg-success text-on-success" : tone === "brand" ? "bg-brand text-on-brand" : "bg-sunken text-ink";
  return (
    <div className="grid gap-2">
      <span className={`grid size-16 place-items-center rounded-lg shadow-pop ${bg}`}>
        <Icon name={icon} size={24} />
      </span>
      <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
      <p className="text-[15px] leading-[22px]">{text}</p>
    </div>
  );
}

async function Pending({ r }: { r: BadgeRequestView }) {
  const t = await getTranslations("mentoring.badge");
  const links = [r.githubUrl, r.linkedinUrl, r.portfolioUrl].filter(Boolean).length;
  const steps: Array<[string, string, boolean]> = [
    [t("stepSent"), t("stepSentText"), true],
    [t("stepReview"), t("stepReviewText"), false],
    [t("stepBadge"), t("stepBadgeText"), false],
  ];
  return (
    <>
      <Page narrow className="gap-5">
        <Hero icon="clock" tone="brand" title={t("pendingTitle")} text={t("pendingText")} />
        <Card className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <Overline>{t("yourRequest")}</Overline>
            <Badge tone="brand">{t("inReview")}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.domains.map((d) => (
              <Tag key={d} tone="brand">
                {t(`domainList.${d as "Backend"}`)}
              </Tag>
            ))}
          </div>
          <p className="text-sm text-muted">{t("requestMeta", { job: r.jobTitle, experience: t(`experienceOptions.${r.experience as "3-5"}`), links: t("linksProvided", { count: links }) })}</p>
        </Card>
        <section className="grid gap-3">
          <h3 className="font-display text-md font-extrabold uppercase">{t("steps")}</h3>
          <ol className="grid gap-3">
            {steps.map(([a, b, done], i) => (
              <li key={a} className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
                <span className={`grid size-8 place-items-center rounded-full font-display text-sm font-extrabold ${done ? "bg-success text-on-success" : "bg-ink text-accent"}`}>{done ? <Icon name="check" size={16} /> : i + 1}</span>
                <p className="text-sm">
                  <b>{a}</b> {b}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </Page>
      <ActionBar>
        <ButtonLink href="/accueil" size="lg" block>
          {t("home")}
        </ButtonLink>
        <ButtonLink href="/mentorat/badge?modifier=1" variant="secondary" block>
          {t("edit")}
        </ButtonLink>
      </ActionBar>
    </>
  );
}

async function Granted({ userId, timeZone }: { userId: string; timeZone: string }) {
  const [t, mentor] = await Promise.all([getTranslations("mentoring.badge"), getMentor(userId)]);
  return (
    <>
      <Page narrow className="gap-5">
        <Hero icon="check" tone="success" title={t("grantedTitle")} text={t("grantedText")} />
        <section className="grid gap-2">
          <Overline>{t("catalogue")}</Overline>
          <MentorCard mentor={mentor} timeZone={timeZone} />
        </section>
      </Page>
      <ActionBar>
        <ButtonLink href="/mentorat/disponibilites" size="lg" block>
          {t("openSlots")}
        </ButtonLink>
        <ButtonLink href={`/profil/${userId}`} variant="secondary" block>
          {t("publicProfile")}
        </ButtonLink>
      </ActionBar>
    </>
  );
}

async function BadgeData({ searchParams }: { searchParams: Promise<{ modifier?: string; nouvelle?: string }> }) {
  const user = await pageUser("/mentorat/badge");
  const [{ modifier, nouvelle }, r, t] = await Promise.all([searchParams, myBadgeRequest(user.id), getTranslations("mentoring.badge")]);
  if (user.seniorVerifiedAt) return <Granted userId={user.id} timeZone={user.timeZone} />;
  if (r?.status === "PENDING" && !modifier) return <Pending r={r} />;
  if (r?.status === "REFUSED" && !nouvelle) {
    return (
      <>
        <Page narrow className="gap-5">
          <Hero icon="info" tone="neutral" title={t("refusedTitle")} text={t("refusedText")} />
          {r.refusalReason && <Card className="text-sm">{t("refusedReason", { reason: r.refusalReason })}</Card>}
        </Page>
        <ActionBar>
          <ButtonLink href="/mentorat/badge?nouvelle=1" size="lg" block>
            {t("retry")}
          </ButtonLink>
        </ActionBar>
      </>
    );
  }
  return <BadgeForm initial={r && (r.status === "PENDING" || r.status === "REFUSED") ? r : null} updating={r?.status === "PENDING"} stack={user.stack} />;
}

export default async function BadgePage({ searchParams }: PageProps<"/[locale]/mentorat/badge">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("badge.headingDone")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <BadgeData searchParams={searchParams as Promise<{ modifier?: string; nouvelle?: string }>} />
      </Suspense>
    </>
  );
}
