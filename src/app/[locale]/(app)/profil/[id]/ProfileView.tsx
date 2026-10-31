"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { InviteSheet } from "@/components/features/InviteSheet";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ShareButton } from "@/components/features/ShareButton";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, Stat, TagList } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { Profile } from "@/lib/domain-types";
import { initials } from "@/lib/format";

/** A member's public profile. */
export function ProfileView({ profile: m, isMe }: { profile: Profile; isMe: boolean }) {
  const t = useTranslations("profile.public");
  const tl = useTranslations("profile.levels");
  const router = useRouter();
  const [invite, setInvite] = useState(false);
  const [invited, setInvited] = useState(m.invited);
  const [report, setReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = m.name.split(" ")[0];

  async function unblock() {
    try {
      await api(`/api/blocks/${m.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("unblockFailed"));
    }
  }

  const place = m.city && m.country ? `${m.city}, ${m.country}` : m.city || m.country;
  return (
    <>
      <TopBar
        back={isMe ? "/profil" : "/membres"}
        title={m.name}
        actions={
          <>
            <ShareButton path={`/profil/${m.id}`} label={t("share")} title={m.name} />
            {!isMe && <IconButton icon="flag" label={t("report")} onClick={() => setReport(true)} />}
          </>
        }
      />
      <Page narrow>
        <Card className="gap-3.5">
          <div className="flex items-center gap-3.5">
            <Avatar initials={initials(m.name)} size="xl" tone={m.verified ? "brand" : "neutral"} />
            <div className="grid min-w-0 gap-1">
              <h1 className="font-display text-xl font-extrabold">{m.name}</h1>
              <p className="text-sm text-muted">{[m.headline, place, m.diaspora ? t("diaspora") : ""].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {m.verified ? (
              <Badge tone="success" icon="check">
                {t("mentor")}
              </Badge>
            ) : (
              <Badge tone="brand">{tl(m.level)}</Badge>
            )}
            {m.years > 0 && <Badge>{t("years", { count: m.years })}</Badge>}
          </div>
          {m.bio && <p className="text-[15px] leading-[22px]">{m.bio}</p>}
        </Card>

        {m.stats ? (
          <Card className="grid-cols-3 gap-3 px-4 py-3.5">
            <Stat value={m.stats.sessions} label={t("sessions")} />
            <Stat value={t("hours", { count: m.stats.hours })} label={t("hoursLabel")} />
            <Stat value={m.stats.judged} label={t("judged")} />
          </Card>
        ) : m.testsValidated > 0 ? (
          <Card className="px-4 py-3.5">
            <Stat value={m.testsValidated} label={t("tests", { count: m.testsValidated })} />
          </Card>
        ) : null}

        {m.stack.length > 0 && (
          <section className="grid gap-2" aria-labelledby="stack">
            <Overline as="h2" id="stack">
              {t("stack")}
            </Overline>
            <TagList items={m.stack} />
          </section>
        )}

        {isMe && (
          <Alert tone="info">
            {t("myProfile")}{" "}
            <ButtonLink href="/profil/modifier" variant="ghost" size="sm">
              {t("editMine")}
            </ButtonLink>
          </Alert>
        )}
        {m.blockedByMe && (
          <Alert tone="info" title={t("blocked", { name: first })}>
            {t("blockedText", { name: first })}{" "}
            <button type="button" onClick={unblock} className="font-extrabold text-brand-text underline">
              {t("unblock")}
            </button>
          </Alert>
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </Page>
      {!isMe && !m.blockedByMe && (
        <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
          {m.conversationId ? (
            <ButtonLink href={`/messages/${m.conversationId}`} variant="secondary" icon="message">
              {t("write")}
            </ButtonLink>
          ) : (
            <Button variant="secondary" onClick={() => setInvite(true)} disabled={invited || m.isContact} icon={invited ? "check" : undefined}>
              {invited ? t("invited") : t("invite")}
            </Button>
          )}
          {m.verified ? <ButtonLink href={`/mentorat/mentors/${m.id}`}>{t("book")}</ButtonLink> : <ButtonLink href="/membres">{t("others")}</ButtonLink>}
        </ActionBar>
      )}
      <InviteSheet
        target={invite ? m : null}
        open={invite}
        onClose={() => setInvite(false)}
        onSent={() => {
          setInvited(true);
          setInvite(false);
        }}
      />
      <ReportSheet open={report} onClose={() => setReport(false)} subject={t("reportSubject")} target={{ type: "USER", id: m.id }} onBlocked={() => router.refresh()} />
    </>
  );
}
