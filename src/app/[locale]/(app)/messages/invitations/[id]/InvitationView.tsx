"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MessageBubble } from "@/components/features/Thread";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, MentorBadge } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { InvitationDetail } from "@/lib/messaging-types";
import { useChatTime } from "../../useChatTime";

export function InvitationView({ invitation }: { invitation: InvitationDetail }) {
  const t = useTranslations("messaging.invitation");
  const tl = useTranslations("profile.levels");
  const time = useChatTime();
  const router = useRouter();
  const from = invitation.from;
  const first = from.name.split(" ")[0];
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const answered = invitation.status !== "PENDING";

  async function answer(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    setError(null);
    try {
      const { conversationId } = await api<{ conversationId: string | null }>(`/api/invitations/${invitation.id}`, { body: { accept } });
      router.replace(accept && conversationId ? `/messages/${conversationId}` : "/messages/invitations");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
      setBusy(null);
    }
  }

  return (
    <>
      <TopBar back="/messages/invitations" title={t("title")} actions={<IconButton icon="flag" label={t("report")} onClick={() => setReport(true)} />} />
      <Page narrow className="flex-1 content-start gap-6 pt-7">
        <div className="grid justify-items-center gap-2.5 text-center">
          <Avatar initials={initials(from.name)} src={from.photo} size="xl" verified={from.role === "SENIOR"} />
          <div className="grid gap-0.5">
            <h2 className="font-display text-xl font-extrabold">{from.name}</h2>
            <span className="text-sm text-muted">
              {[from.city && `${from.city}, ${from.country}`, from.stack.join(", "), from.years ? t("years", { count: from.years }) : ""].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <Badge tone="brand">{tl(from.level)}</Badge>
            {from.role === "SENIOR" && <MentorBadge>{t("mentorVerified")}</MentorBadge>}
          </div>
        </div>
        {/* P8: the sender's presentation, so the invitation can be answered knowing who writes. */}
        {from.bio && (
          <section aria-labelledby="inv-bio" className="grid gap-1.5 rounded-lg border-2 border-line-strong bg-raised p-4">
            <h3 id="inv-bio" className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">
              {t("presentation")}
            </h3>
            {from.headline && <p className="text-sm font-bold">{from.headline}</p>}
            <p className="text-[15px] leading-[22px] whitespace-pre-line">{from.bio}</p>
          </section>
        )}
        {invitation.message && <MessageBubble text={invitation.message} time={time.short(invitation.createdAt)} />}
        {answered ? (
          <div className="grid gap-3">
            <Alert tone="info">{invitation.status === "ACCEPTED" ? t("acceptedAlready", { name: first }) : invitation.status === "DECLINED" ? t("declinedAlready", { name: first }) : t("alreadyAnswered")}</Alert>
            {invitation.status === "ACCEPTED" && invitation.conversationId && (
              <ButtonLink href={`/messages/${invitation.conversationId}`} variant="ink" icon="message" block>
                {t("write")}
              </ButtonLink>
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-muted">
            {t("note", { name: first })}
          </p>
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </Page>
      {!answered && (
        <ActionBar className="grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => setConfirmDecline(true)} disabled={busy !== null}>
            {busy === "decline" ? t("declining") : t("decline")}
          </Button>
          <Button size="lg" onClick={() => answer(true)} disabled={busy !== null}>
            {busy === "accept" ? t("accepting") : t("accept")}
          </Button>
        </ActionBar>
      )}
      {!answered && (
        <ConfirmSheet
          open={confirmDecline}
          onClose={() => setConfirmDecline(false)}
          title={t("declineTitle")}
          text={t("declineText", { name: first })}
          confirm={t("decline")}
          busy={busy !== null}
          onConfirm={() => answer(false)}
        />
      )}
      <ReportSheet
        open={report}
        onClose={() => setReport(false)}
        subject={t("subject")}
        target={{ type: "INVITATION", id: invitation.id }}
        onBlocked={() => {
          router.replace("/messages/invitations");
          router.refresh();
        }}
      />
    </>
  );
}
