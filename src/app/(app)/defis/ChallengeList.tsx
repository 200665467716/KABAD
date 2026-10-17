"use client";

import { useState } from "react";
import { ChallengeCard } from "@/components/features/ChallengeCard";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Segmented } from "@/components/ui/Controls";
import { challenges, type ChallengeStatus } from "@/lib/data";

export function ChallengeList() {
  const [tab, setTab] = useState<ChallengeStatus>("open");
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
            { value: "open", label: "Ouverts" },
            { value: "jury", label: "En jury" },
            { value: "done", label: "Terminés" },
          ]}
        />
      </TopBar>
      <Page>
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </div>
      </Page>
    </>
  );
}
