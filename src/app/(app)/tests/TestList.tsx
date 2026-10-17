"use client";

import Link from "next/link";
import { useState } from "react";
import { AppTile } from "@/components/features/AppTile";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Badge, CardLink } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { member, tests } from "@/lib/data";

export function TestList() {
  const [tab, setTab] = useState<"todo" | "mine">("todo");
  const owned = tests[0];
  return (
    <>
      <TopBar
        title="Tests"
        actions={
          <Button size="sm" variant="secondary" icon="plus">
            Mon app
          </Button>
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
            { value: "mine", label: "Mes apps", count: owned.toRead },
          ]}
        />
      </TopBar>
      <Page>
        {tab === "todo" ? (
          <>
            <p className="text-sm text-muted">Testez les projets de la communauté. C’est gratuit, et vos retours aident un autre développeur à avancer.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {tests.map((t) => {
                const owner = member(t.ownerId);
                return (
                  <CardLink key={t.id} href={`/tests/${t.id}`}>
                    <div className="flex items-start gap-3">
                      <AppTile app={t} />
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <h2 className="font-display text-lg font-bold">{t.name}</h2>
                        <span className="text-sm text-muted">
                          {owner.name} · {owner.city}
                        </span>
                      </div>
                      <Badge>{t.platform}</Badge>
                    </div>
                    <p className="text-sm">{t.task}</p>
                    <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Icon name="clock" size={16} className="text-muted" />
                        {t.minutes} min
                      </span>
                      <span className="text-sm text-muted tabular">
                        {t.slotsLeft} places sur {t.slots}
                      </span>
                    </div>
                  </CardLink>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Les rapports reçus sur vos applications. Vous les validez après les avoir lus.</p>
            <Link href={`/tests/${owned.id}/rapports`} className="flex items-center gap-3 rounded-lg border border-line bg-raised p-4 text-ink no-underline shadow-sm hover:border-line-strong">
              <AppTile app={owned} />
              <span className="grid flex-1 gap-0.5">
                <span className="font-display text-lg font-bold">{owned.name}</span>
                <span className="text-sm text-muted tabular">
                  {owned.reportsCount} rapports · {owned.toRead} à lire
                </span>
              </span>
              <Icon name="chevron" size={18} className="text-subtle" />
            </Link>
            <p className="text-xs text-muted">Démonstration : cette app appartient à Awa Diop. Le compte de démonstration voit sa vue de porteur.</p>
          </>
        )}
      </Page>
    </>
  );
}
