"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InviteSheet } from "@/components/features/InviteSheet";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ShareButton } from "@/components/features/ShareButton";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, Stat } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { disconnectRealtime } from "@/lib/realtime-client";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/domain-types";
import { hardNavigate } from "@/lib/hard-navigate";

export function ProfileView({ profile: m, isMe, isAdmin }: { profile: Profile; isMe: boolean; isAdmin: boolean }) {
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
      setError(e instanceof ApiError ? e.message : "Le déblocage n’a pas abouti.");
    }
  }

  return (
    <>
      <TopBar
        back="/accueil"
        plain
        actions={
          <>
            <ShareButton path={`/profil/${m.id}`} label="Partager le profil" title={m.name} />
            {!isMe && <IconButton icon="flag" label="Signaler ou bloquer ce membre" onClick={() => setReport(true)} />}
          </>
        }
      />
      <Page narrow className="pt-1">
        <div className="grid gap-3.5">
          <Avatar initials={initials(m.name)} size="xl" tone={isMe ? "accent" : "brand"} />
          <div className="grid gap-1">
            <h1 className="font-display text-[30px] leading-[36px] font-bold tracking-[-0.03em]">{m.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {m.role === "SENIOR" ? (
                m.verified ? (
                  <Badge tone="brand" icon="check">
                    Statut Senior vérifié
                  </Badge>
                ) : (
                  <Badge>Senior · vérification en cours</Badge>
                )
              ) : (
                <Badge>Junior</Badge>
              )}
              <span className="text-sm text-muted">
                {[m.city && m.country ? `${m.city}, ${m.country}` : m.city || m.country, m.diaspora ? "Diaspora" : "", m.headline, m.years ? `${m.years} an${m.years > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
          {m.bio && <p>{m.bio}</p>}
        </div>

        {m.stats ? (
          <Card className="grid-cols-3 gap-3 px-4 py-3.5">
            <Stat value={m.stats.pairs} label="binômes accompagnés" />
            <Stat value={`${m.stats.hours} h`} label="de mentorat confirmé" />
            <Stat value={m.stats.judged} label="défis jugés" />
          </Card>
        ) : m.testsValidated > 0 ? (
          <Card className="grid-cols-3 gap-3 px-4 py-3.5">
            <Stat value={m.testsValidated} label={`test${m.testsValidated > 1 ? "s" : ""} validé${m.testsValidated > 1 ? "s" : ""}`} />
          </Card>
        ) : null}

        {m.stack.length > 0 && (
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
        )}

        {isMe && (
          <div className="grid gap-2">
            <ButtonLink href="/inscription/profil" variant="secondary">
              Modifier mon profil
            </ButtonLink>
            <ButtonLink href="/compte" variant="secondary">
              Mon compte : mot de passe, membres bloqués, données
            </ButtonLink>
            <Button
              variant="ghost"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" }).catch(() => {});
                disconnectRealtime();
                hardNavigate("/connexion");
              }}
            >
              Se déconnecter
            </Button>
            {isAdmin && (
              <ButtonLink href="/admin" variant="ghost" icon="lock">
                Tableau de bord de l’équipe
              </ButtonLink>
            )}
          </div>
        )}
        {m.blockedByMe && (
          <Alert tone="info" title={`Vous avez bloqué ${first}.`}>
            {first} ne peut plus vous écrire ni vous inviter.{" "}
            <button type="button" onClick={unblock} className="font-bold text-brand-text underline">
              Débloquer
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
              Écrire
            </ButtonLink>
          ) : (
            <Button variant="secondary" onClick={() => setInvite(true)} disabled={invited || m.isContact} icon={invited ? "check" : undefined}>
              {invited ? "Invitation envoyée" : "Inviter"}
            </Button>
          )}
          {m.role === "SENIOR" && m.verified ? (
            <ButtonLink href={`/mentorat/demande/${m.id}`}>Demander un mentorat</ButtonLink>
          ) : (
            <ButtonLink href="/membres">Voir d’autres membres</ButtonLink>
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
      <ReportSheet open={report} onClose={() => setReport(false)} subject="ce profil" target={{ type: "USER", id: m.id }} onBlocked={() => router.refresh()} />
    </>
  );
}
