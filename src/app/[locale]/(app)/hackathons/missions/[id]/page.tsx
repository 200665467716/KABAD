import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Card, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { ActionButton } from "@/components/features/hackathons/ActionButton";
import { formatFCFA, initials } from "@/lib/format";
import { getMission } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.mission");
  return { title: t("title") };
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/missions/${id}`);
  const m = await orNotFound(getMission(user.id, id));
  if (!m) notFound();
  const [t, tf, format] = await Promise.all([getTranslations("hackathons.mission"), getTranslations("hackathons.format"), getFormatter()]);
  const h = m.hackathon;
  const hours = Math.round((new Date(h.endsAt).getTime() - new Date(h.startsAt).getTime()) / 3_600_000);
  // The organizer writes the mission as sentences: one expectation per sentence.
  const tasks = (h.missionText ?? "")
    .split(/(?<=\.)\s+|\n+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);

  return (
    <>
      {/* Once answered, the mission is no longer "offered". */}
      <TopBar back="/hackathons" title={m.status === "PROPOSED" ? t("title") : m.status === "ACCEPTED" ? t("accepted") : t("declined")} />
      <Page narrow>
        {/* The organizer: a tap opens their profile (P16), from where one can write to them. */}
        {m.organizerId ? (
          <Link href={`/profil/${m.organizerId}`} className="flex items-center gap-3 text-ink no-underline">
            <Avatar initials={initials(h.organizerName)} size="lg" tone="neutral" />
            <p className="text-[15px]">
              <b className="underline decoration-2 underline-offset-2">{h.organizerName}</b> {t("offers")}
            </p>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar initials={initials(h.organizerName)} size="lg" tone="neutral" />
            <p className="text-[15px]">
              <b>{h.organizerName}</b> {t("offers")}
            </p>
          </div>
        )}
        <Card featured className="gap-2">
          <span className="text-xs font-extrabold tracking-[0.08em] text-brand-text uppercase">
            {t("role")} · {tf(h.format)}
            {h.city ? ` · ${h.city}` : ""}
          </span>
          <span className="font-display text-lg font-extrabold">{h.title}</span>
          <span className="text-sm text-muted">
            {format.dateTimeRange(new Date(h.startsAt), new Date(h.endsAt), { day: "numeric", month: "short" })} · {t("hours", { hours })}
          </span>
          <div className="mt-1 grid gap-0.5 rounded-action bg-ink px-3.5 py-3 text-raised">
            <span className="text-xs font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{t("fee")}</span>
            <span className="font-display text-2xl font-extrabold text-accent tabular">{formatFCFA(m.fee)}</span>
          </div>
        </Card>
        {tasks.length > 0 && (
          <section aria-labelledby="expect" className="grid gap-2">
            <Overline as="h2" id="expect">
              {t("expect")}
            </Overline>
            <ul className="m-0 grid list-none gap-2 p-0">
              {tasks.map((task) => (
                <li key={task} className="flex items-start gap-2.5 text-[15px]">
                  <Icon name="checkCircle" size={20} className="mt-0.5 text-brand-text" />
                  {task}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-sm text-muted">{t("payment")}</p>
        {m.status === "ACCEPTED" && <p className="rounded-action bg-brand-wash px-4 py-3 text-sm">{m.groupId ? t("acceptedText") : t("acceptedNoGroup")}</p>}
      </Page>
      <ActionBar>
        {m.status === "PROPOSED" ? (
          <div className="grid grid-cols-2 gap-2">
            <ActionButton url={`/api/missions/${m.id}`} body={{ accept: false }} size="lg" block then="/notifications" sheet={{ title: t("declineTitle"), text: t("declineText", { name: h.organizerName }), confirm: t("decline") }}>
              {t("decline")}
            </ActionButton>
            <ActionButton url={`/api/missions/${m.id}`} body={{ accept: true }} variant="primary" size="lg" block then={`/hackathons/missions/${m.id}`}>
              {t("accept")}
            </ActionButton>
          </div>
        ) : (
          <div className="grid gap-2">
            <Badge tone={m.status === "ACCEPTED" ? "success" : "neutral"} className="justify-self-center">
              {m.status === "ACCEPTED" ? t("accepted") : t("declined")}
            </Badge>
            {m.groupId && (
              <ButtonLink href={`/messages/${m.groupId}`} variant="primary" icon="users" block>
                {t("openGroup")}
              </ButtonLink>
            )}
            <ButtonLink href={`/hackathons/${h.id}`} variant="secondary" block>
              {t("see")}
            </ButtonLink>
          </div>
        )}
      </ActionBar>
    </>
  );
}

export default async function MissionPage({ params }: PageProps<"/[locale]/hackathons/missions/[id]">) {
  const t = await getTranslations("hackathons.mission");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <Data params={params} />
    </Suspense>
  );
}
