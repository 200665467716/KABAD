"use client";

import { useState } from "react";
import { InviteSheet } from "@/components/features/InviteSheet";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { member, recommendations, type Member } from "@/lib/data";
import { initials } from "@/lib/format";

export function Recommendations() {
  const [sent, setSent] = useState<string[]>([]);
  const [target, setTarget] = useState<Member | null>(null);

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
      <ul className="m-0 grid list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
        {recommendations.map((r) => {
          const m = member(r.memberId);
          const done = sent.includes(m.id);
          return (
            <li key={m.id} className="px-3.5 py-3">
              <PersonRow
                avatar={<Avatar initials={initials(m.name)} />}
                name={m.name}
                badge={m.role === "senior" ? <Badge tone="brand">Senior</Badge> : undefined}
                meta={`${m.city}${m.diaspora ? " · Diaspora" : ""} · ${m.stack.slice(0, 2).join(", ")}`}
                extra={<span className="text-xs font-bold text-brand-text">{r.why}</span>}
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
