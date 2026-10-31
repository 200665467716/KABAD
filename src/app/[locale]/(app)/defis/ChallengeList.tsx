"use client";

import { useState } from "react";
import { ChallengeCard } from "@/components/features/ChallengeCard";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Segmented } from "@/components/ui/Controls";
import type { ChallengeSummary } from "@/lib/domain-types";

const EMPTY: Record<ChallengeSummary["status"], string> = {
  OPEN: "Aucun défi ouvert pour l’instant. Les prochains arrivent bientôt.",
  JURY: "Aucun défi en cours d’évaluation.",
  DONE: "Aucun défi terminé pour l’instant.",
};

export function ChallengeList({ challenges }: { challenges: ChallengeSummary[] }) {
  const [tab, setTab] = useState<ChallengeSummary["status"]>("OPEN");
  const list = challenges.filter((c) => c.status === tab);
  return (
    <>
      <TopBar title="Défis">
        <Segmented
          label="État des défis"
          stretch
          className="lg:inline-grid lg:min-w-[420px]"
          value={tab}
          onChange={setTab}
          items={[
            { value: "OPEN", label: "Ouverts" },
            { value: "JURY", label: "En jury" },
            { value: "DONE", label: "Terminés" },
          ]}
        />
      </TopBar>
      <Page>
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </div>
        {list.length === 0 && <p className="py-8 text-center text-muted">{EMPTY[tab]}</p>}
      </Page>
    </>
  );
}
