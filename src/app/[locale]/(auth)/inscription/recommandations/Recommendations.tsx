"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { InviteSheet, type InviteTarget } from "@/components/features/InviteSheet";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import type { Recommendation } from "@/lib/domain-types";
import { initials } from "@/lib/format";

export function Recommendations({ people }: { people: Recommendation[] }) {
  const t = useTranslations("auth.suggestions");
  const [sent, setSent] = useState<string[]>([]);
  const [target, setTarget] = useState<InviteTarget | null>(null);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    const data = { title: t("shareTitle"), text: t("shareText"), url };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else {
      await navigator.clipboard?.writeText(`${t("shareText")} ${url}`).catch(() => {});
      setCopied(true);
    }
  }

  const empty = people.length === 0;
  return (
    <AuthFrame
      back="/inscription/interets"
      heading={t("heading")}
      step={5}
      title={t("title")}
      lead={empty ? t("emptyLead") : t("lead")}
      footer={
        <>
          {!empty && (
            <p className="text-center text-sm text-muted tabular" aria-live="polite">
              {t("sentCount", { count: sent.length })}
            </p>
          )}
          <ButtonLink href="/accueil" size="lg" block>
            {t("finish")}
          </ButtonLink>
          {!empty && (
            <Link href="/accueil" className="py-3 text-center text-sm font-extrabold text-brand-text no-underline">
              {t("skip")}
            </Link>
          )}
        </>
      }
    >
      {empty ? (
        <div className="grid justify-items-start gap-3 rounded-lg border-2 border-line-strong bg-raised p-5">
          <span className="grid size-14 place-items-center rounded-lg bg-header text-on-header" aria-hidden="true">
            <Icon name="users" />
          </span>
          <p className="font-display text-md font-extrabold uppercase">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">{t("emptyText")}</p>
          <Button variant="secondary" icon="share" onClick={share}>
            {t("inviteKnown")}
          </Button>
          {copied && (
            <p role="status" className="text-sm font-bold text-success">
              {t("copied")}
            </p>
          )}
        </div>
      ) : (
        <ul className="m-0 grid list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
          {people.map((m) => {
            const done = sent.includes(m.id);
            return (
              <li key={m.id} className="px-3.5 py-3">
                <PersonRow
                  avatar={<Avatar initials={initials(m.name)} size="lg" tone={m.verified ? "brand" : "neutral"} />}
                  name={m.name}
                  badge={m.verified ? <Badge tone="brand">{t("mentor")}</Badge> : undefined}
                  meta={[m.headline, m.city].filter(Boolean).join(" · ")}
                  extra={<span className="text-xs font-extrabold text-brand-text">{t(`why.${m.why.key}`, { tech: m.why.tech ?? "" })}</span>}
                  action={
                    done ? (
                      <Button size="sm" variant="secondary" icon="check" disabled>
                        {t("sent")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ink" onClick={() => setTarget(m)} aria-label={t("inviteAria", { name: m.name })}>
                        {t("invite")}
                      </Button>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
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
