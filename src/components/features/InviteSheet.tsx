"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import type { Member } from "@/lib/data";
import { initials } from "@/lib/format";
import { charactersLeft, checkInvitationMessage, INVITATION_MAX_LENGTH } from "@/lib/invitation";

const DEFAULT_MESSAGE =
  "Bonjour, je suis développeur Node.js à Lomé. Je prépare une API de paiement mobile et j’aimerais avoir votre avis sur la structure de la base. Seriez-vous ouvert à un échange ?";

/** Invite a member with one first message (300 characters at most). The conversation opens once they accept. */
export function InviteSheet({ target, open, onClose, onSent }: { target: Member | null; open: boolean; onClose: () => void; onSent: (id: string) => void }) {
  const [text, setText] = useState(DEFAULT_MESSAGE);
  const [error, setError] = useState<string | null>(null);
  if (!target) return null;
  const first = target.name.split(" ")[0];
  const left = charactersLeft(text);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Inviter ${first}`}
      footer={
        <Button
          size="lg"
          block
          icon="send"
          onClick={() => {
            const check = checkInvitationMessage(text);
            if (!check.ok) return setError(check.error);
            setError(null);
            onSent(target.id);
          }}
        >
          Envoyer l’invitation
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
        hint="Présentez-vous et dites ce que vous cherchez."
        error={error}
        counter={`${INVITATION_MAX_LENGTH - left} / ${INVITATION_MAX_LENGTH}`}
      />
      <Alert tone="info">La conversation s’ouvre seulement si {first} accepte votre invitation.</Alert>
    </Sheet>
  );
}
