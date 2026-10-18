"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { Member } from "@/lib/data";
import { initials } from "@/lib/format";
import { charactersLeft, checkInvitationMessage, INVITATION_MAX_LENGTH } from "@/lib/invitation";

/** Invite a member with one first message (300 characters at most). The conversation opens once they accept. */
export function InviteSheet({ target, open, onClose, onSent }: { target: Member | null; open: boolean; onClose: () => void; onSent: (id: string) => void }) {
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
      setError(e instanceof ApiError ? e.message : "L’invitation n’est pas partie. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Inviter ${first}`}
      footer={
        <Button size="lg" block icon="send" onClick={send} disabled={busy}>
          {busy ? "Envoi…" : "Envoyer l’invitation"}
        </Button>
      }
    >
      <PersonRow
        avatar={<Avatar initials={initials(target.name)} size="lg" />}
        name={target.name}
        badge={target.role === "senior" ? <Badge tone="brand">Senior</Badge> : undefined}
        meta={`${target.city}${target.diaspora ? " · Diaspora" : ""} · ${target.headline}, ${target.years} ans`}
      />
      <TextArea
        id="invite-message"
        label="Votre premier message"
        rows={5}
        value={text}
        maxLength={INVITATION_MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        placeholder="Présentez-vous et dites ce que vous cherchez."
        hint="Présentez-vous et dites ce que vous cherchez."
        error={error}
        counter={`${INVITATION_MAX_LENGTH - left} / ${INVITATION_MAX_LENGTH}`}
      />
      {needsLogin && (
        <Link href="/connexion" className="text-sm font-bold text-brand-text">
          Se connecter
        </Link>
      )}
      <Alert tone="info">La conversation s’ouvre seulement si {first} accepte votre invitation.</Alert>
    </Sheet>
  );
}
