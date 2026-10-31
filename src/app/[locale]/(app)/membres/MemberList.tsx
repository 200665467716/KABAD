"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { InviteSheet, type InviteTarget } from "@/components/features/InviteSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Card, PersonRow } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/domain-types";

export function MemberList({ members }: { members: DirectoryEntry[] }) {
  const [target, setTarget] = useState<InviteTarget | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {members.map((m) => {
          const relation = invited.includes(m.id) ? "invited" : m.relation;
          return (
            <Card key={m.id} className="content-start gap-3 px-4 py-3.5">
              <Link href={`/profil/${m.id}`} className="text-ink no-underline">
                <PersonRow
                  avatar={<Avatar initials={initials(m.name)} />}
                  name={m.name}
                  badge={m.role === "SENIOR" ? <Badge tone="brand">{m.verified ? "Senior" : "Senior · à vérifier"}</Badge> : undefined}
                  meta={[m.headline, m.city, m.diaspora ? "Diaspora" : ""].filter(Boolean).join(" · ")}
                />
              </Link>
              {m.stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.stack.slice(0, 5).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-line pt-2.5">
                {relation === "contact" ? (
                  <ButtonLink href={m.conversationId ? `/messages/${m.conversationId}` : `/profil/${m.id}`} size="sm" variant="secondary" icon="message">
                    Écrire
                  </ButtonLink>
                ) : relation === "invited_you" ? (
                  <ButtonLink href={`/messages/invitations/${m.invitationId}`} size="sm">
                    Voir son invitation
                  </ButtonLink>
                ) : relation === "invited" ? (
                  <Button size="sm" variant="secondary" icon="check" disabled>
                    Invitation envoyée
                  </Button>
                ) : (
                  <Button size="sm" icon="userPlus" onClick={() => setTarget(m)} aria-label={`Inviter ${m.name}`}>
                    Inviter
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <InviteSheet
        target={target}
        open={target !== null}
        onClose={() => setTarget(null)}
        onSent={(id) => {
          setInvited((x) => [...x, id]);
          setTarget(null);
        }}
      />
    </>
  );
}
