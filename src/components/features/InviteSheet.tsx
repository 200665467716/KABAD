"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { MemberCard } from "@/lib/domain-types";
import { initials } from "@/lib/format";
import { charactersLeft, checkInvitationMessage, INVITATION_MAX_LENGTH } from "@/lib/invitation";

/** Invite a member with one first message (300 characters at most). The conversation opens once they accept. */
export type InviteTarget = Pick<MemberCard, "id" | "name" | "role" | "city"> & Partial<Pick<MemberCard, "diaspora" | "headline" | "years">>;

export function InviteSheet({ target, open, onClose, onSent }: { target: InviteTarget | null; open: boolean; onClose: () => void; onSent: (id: string) => void }) {
  const t = useTranslations("messaging.invite");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!target) return null;
  const first = target.name.split(" ")[0];
  const left = charactersLeft(text);

  async function send() {
    const check = checkInvitationMessage(text);
    if (!check.ok) return setError(check.error);
    setError(null);
    setBusy(true);
    try {
      await api("/api/invitations", { body: { toId: target!.id, message: check.message } });
      setText("");
      onSent(target!.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setNeedsLogin(true);
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title", { name: first })}
      footer={
        <Button size="lg" block icon="send" onClick={send} disabled={busy}>
          {busy ? t("sending") : t("send")}
        </Button>
      }
    >
      <PersonRow
        avatar={<Avatar initials={initials(target.name)} size="lg" />}
        name={target.name}
        badge={target.role === "SENIOR" ? <Badge tone="brand">{t("mentor")}</Badge> : undefined}
        meta={[target.city, target.diaspora ? t("diaspora") : "", target.headline, target.years ? t("years", { count: target.years }) : ""].filter(Boolean).join(" · ")}
      />
      <TextArea
        id="invite-message"
        label={t("label")}
        rows={5}
        value={text}
        maxLength={INVITATION_MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("hint")}
        hint={t("hint")}
        error={error}
        counter={`${INVITATION_MAX_LENGTH - left} / ${INVITATION_MAX_LENGTH}`}
      />
      {needsLogin && (
        <Link href="/connexion" className="text-sm font-bold text-brand-text">
          {t("signIn")}
        </Link>
      )}
      <Alert tone="info">{t("note", { name: first })}</Alert>
    </Sheet>
  );
}
