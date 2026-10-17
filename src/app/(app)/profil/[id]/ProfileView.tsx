"use client";

import { useState } from "react";
import { InviteSheet } from "@/components/features/InviteSheet";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Avatar, Badge, Card, Overline, Stat } from "@/components/ui/Display";
import { CURRENT_USER_ID, member } from "@/lib/data";
import { initials } from "@/lib/format";

export function ProfileView({ memberId }: { memberId: string }) {
  const m = member(memberId);
  const me = m.id === CURRENT_USER_ID;
  const [invite, setInvite] = useState(false);
  const [invited, setInvited] = useState(false);
  const [report, setReport] = useState(false);

  return (
    <>
      <TopBar
        back="/accueil"
        plain
        actions={
          <>
            <IconButton icon="share" label="Partager le profil" />
            {!me && <IconButton icon="more" label="Signaler ce profil" onClick={() => setReport(true)} />}
          </>
        }
      />
      <Page narrow className="pt-1">
        <div className="grid gap-3.5">
          <Avatar initials={initials(m.name)} size="xl" tone={me ? "accent" : "brand"} />
          <div className="grid gap-1">
            <h1 className="font-display text-[30px] leading-[36px] font-bold tracking-[-0.03em]">{m.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {m.role === "senior" ? <Badge tone="brand" icon="check">Statut Senior vérifié</Badge> : <Badge>Junior</Badge>}
              <span className="text-sm text-muted">
                {m.city}, {m.country}
                {m.diaspora ? " · Diaspora" : ""} · {m.headline} · {m.years} an{m.years > 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <p>{m.bio}</p>
        </div>

        {m.stats && (
          <Card className="grid-cols-3 gap-3 px-4 py-3.5">
            <Stat value={m.stats.pairs} label="binômes accompagnés" />
            <Stat value={`${m.stats.hours} h`} label="de mentorat confirmé" />
            <Stat value={m.stats.judged} label="défis jugés" />
          </Card>
        )}

        <section className="grid gap-2" aria-labelledby="stack">
          <Overline as="h2" id="stack">
            Stack
          </Overline>
          <div className="flex flex-wrap gap-1.5">
            {m.stack.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        </section>
      </Page>
      {!me && (
        <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
          <Button variant="secondary" onClick={() => setInvite(true)} disabled={invited} icon={invited ? "check" : undefined}>
            {invited ? "Invité" : "Inviter"}
          </Button>
          {m.role === "senior" ? (
            <ButtonLink href={`/mentorat/demande/${m.id}`}>Demander un mentorat</ButtonLink>
          ) : (
            <ButtonLink href="/messages">Voir mes messages</ButtonLink>
          )}
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
      <ReportSheet open={report} onClose={() => setReport(false)} subject="ce profil" />
    </>
  );
}
