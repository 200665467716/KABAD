"use client";

import { useState } from "react";
import { InviteSheet, type InviteTarget } from "@/components/features/InviteSheet";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, PersonRow } from "@/components/ui/Display";
import type { Recommendation } from "@/lib/domain-types";
import { initials } from "@/lib/format";

export function Recommendations({ people }: { people: Recommendation[] }) {
  const [sent, setSent] = useState<string[]>([]);
  const [target, setTarget] = useState<InviteTarget | null>(null);

  return (
    <AuthFrame
      back="/inscription/profil"
      step={3}
      skip="/accueil"
      title="Des développeurs à rencontrer"
      lead="Choisis pour vous selon votre stack et votre pays. Chaque invitation part avec un court message."
      footer={
        <>
          <p className="text-center text-sm text-muted tabular" aria-live="polite">
            {sent.length} invitation{sent.length > 1 ? "s" : ""} envoyée{sent.length > 1 ? "s" : ""}
          </p>
          <ButtonLink href="/accueil" size="lg" block>
            Terminer
          </ButtonLink>
        </>
      }
    >
      <ul className="m-0 grid list-none divide-y divide-line rounded-lg border-2 border-line-strong bg-raised p-0">
        {people.map((m) => {
          const done = sent.includes(m.id);
          return (
            <li key={m.id} className="px-3.5 py-3">
              <PersonRow
                avatar={<Avatar initials={initials(m.name)} />}
                name={m.name}
                badge={m.role === "SENIOR" ? <Badge tone="brand">Senior</Badge> : undefined}
                meta={[m.city, m.diaspora ? "Diaspora" : "", m.stack.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
                extra={<span className="text-xs font-bold text-brand-text">{m.why}</span>}
                action={
                  done ? (
                    <Button size="sm" variant="secondary" icon="check" disabled>
                      Envoyée
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setTarget(m)} aria-label={`Inviter ${m.name}`}>
                      Inviter
                    </Button>
                  )
                }
              />
            </li>
          );
        })}
      </ul>
      {people.length === 0 && <p className="py-6 text-center text-muted">Personne à vous proposer pour l’instant. Retrouvez tous les membres dans l’annuaire.</p>}
      <InviteSheet
        target={target}
        open={target !== null}
        onClose={() => setTarget(null)}
        onSent={(id) => {
          setSent((s) => [...s, id]);
          setTarget(null);
        }}
      />
    </AuthFrame>
  );
}
