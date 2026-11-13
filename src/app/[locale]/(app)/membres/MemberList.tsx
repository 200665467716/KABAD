"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { InviteSheet, type InviteTarget } from "@/components/features/InviteSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Card, PersonRow, TagList } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/domain-types";

export function MemberList({ members }: { members: DirectoryEntry[] }) {
  const t = useTranslations("profile.members");
  const [target, setTarget] = useState<InviteTarget | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  return (
    <>
      <div className="kb-stagger grid gap-3 md:grid-cols-2">
        {members.map((m) => {
          const relation = invited.includes(m.id) ? "invited" : m.relation;
          return (
            <Card key={m.id} className="content-start gap-3 px-4 py-3.5">
              <Link href={`/profil/${m.id}`} className="text-ink no-underline">
                <PersonRow
                  avatar={<Avatar initials={initials(m.name)} src={m.photo} tone={m.verified ? "brand" : "neutral"} />}
                  name={m.name}
                  badge={m.verified ? <Badge tone="success">{t("mentor")}</Badge> : undefined}
                  meta={[m.headline, m.city, m.diaspora ? t("diaspora") : ""].filter(Boolean).join(" · ")}
                />
              </Link>
              <TagList items={m.stack.slice(0, 5)} />
              <div className="flex justify-end gap-2 border-t-2 border-line pt-2.5">
                {relation === "contact" ? (
                  <ButtonLink href={m.conversationId ? `/messages/${m.conversationId}` : `/profil/${m.id}`} size="sm" variant="secondary" icon="message">
                    {t("write")}
                  </ButtonLink>
                ) : relation === "invited_you" ? (
                  <ButtonLink href={`/messages/invitations/${m.invitationId}`} size="sm" variant="ink">
                    {t("seeInvitation")}
                  </ButtonLink>
                ) : relation === "invited" ? (
                  <Button size="sm" variant="secondary" icon="check" disabled>
                    {t("invited")}
                  </Button>
                ) : (
                  <Button size="sm" variant="ink" icon="userPlus" onClick={() => setTarget(m)} aria-label={t("inviteAria", { name: m.name })}>
                    {t("invite")}
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
