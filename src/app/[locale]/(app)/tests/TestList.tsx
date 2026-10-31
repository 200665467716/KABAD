"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { AppTile } from "@/components/features/AppTile";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Badge, CardLink } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import type { TestAppSummary } from "@/lib/domain-types";

const PLATFORM = { WEB: "Web", ANDROID: "Android" } as const;
const MY_REPORT = { SUBMITTED: { label: "Rapport envoyé", tone: "brand" }, VALIDATED: { label: "Validé", tone: "success" }, REFUSED: { label: "Refusé", tone: "danger" } } as const;

export function TestList({ toTest, mine }: { toTest: TestAppSummary[]; mine: TestAppSummary[] }) {
  const [tab, setTab] = useState<"todo" | "mine">("todo");
  const toRead = mine.reduce((n, a) => n + a.toRead, 0);
  return (
    <>
      <TopBar
        title="Tests"
        actions={
          <ButtonLink href="/tests/nouveau" size="sm" variant="secondary" icon="plus">
            Mon app
          </ButtonLink>
        }
      >
        <Segmented
          label="Tests"
          stretch
          className="lg:inline-grid lg:min-w-[320px]"
          value={tab}
          onChange={setTab}
          items={[
            { value: "todo", label: "À tester" },
            { value: "mine", label: "Mes apps", count: toRead || undefined },
          ]}
        />
      </TopBar>
      <Page>
        {tab === "todo" ? (
          <>
            <p className="text-sm text-muted">Testez les projets de la communauté. C’est gratuit, et vos retours aident un autre développeur à avancer.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {toTest.map((t) => (
                <CardLink key={t.id} href={`/tests/${t.id}`}>
                  <div className="flex items-start gap-3">
                    <AppTile app={t} />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <h2 className="font-display text-lg font-bold">{t.name}</h2>
                      <span className="text-sm text-muted">
                        {t.owner.name}
                        {t.owner.city ? ` · ${t.owner.city}` : ""}
                      </span>
                    </div>
                    {t.myReport ? <Badge tone={MY_REPORT[t.myReport].tone}>{MY_REPORT[t.myReport].label}</Badge> : <Badge>{PLATFORM[t.platform]}</Badge>}
                  </div>
                  <p className="text-sm">{t.task}</p>
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Icon name="clock" size={16} className="text-muted" />
                      {t.minutes} min
                    </span>
                    <span className="text-sm text-muted tabular">
                      {t.slotsLeft} place{t.slotsLeft > 1 ? "s" : ""} sur {t.slots}
                    </span>
                  </div>
                </CardLink>
              ))}
            </div>
            {toTest.length === 0 && <p className="py-8 text-center text-muted">Aucune application à tester pour l’instant.</p>}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Les rapports reçus sur vos applications. Vous les validez après les avoir lus.</p>
            {mine.map((a) => (
              <Link key={a.id} href={`/tests/${a.id}/rapports`} className="flex items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-4 text-ink no-underline shadow-sm hover:border-line-strong">
                <AppTile app={a} />
                <span className="grid flex-1 gap-0.5">
                  <span className="font-display text-lg font-bold">{a.name}</span>
                  <span className="text-sm text-muted tabular">
                    {a.reportsCount} rapport{a.reportsCount > 1 ? "s" : ""} · {a.toRead} à lire
                  </span>
                </span>
                <Icon name="chevron" size={18} className="text-subtle" />
              </Link>
            ))}
            {mine.length === 0 && (
              <div className="grid justify-items-center gap-3 py-8 text-center">
                <p className="text-muted">Vous n’avez pas encore publié d’application. Faites-la tester par la communauté.</p>
                <ButtonLink href="/tests/nouveau" icon="plus">
                  Publier mon app
                </ButtonLink>
              </div>
            )}
          </>
        )}
      </Page>
    </>
  );
}
