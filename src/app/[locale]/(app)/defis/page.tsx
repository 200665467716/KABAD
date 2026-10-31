import type { Metadata } from "next";
import { Suspense } from "react";
import { listChallenges } from "@/server/challenges";
import { pageUser } from "@/server/page";
import { ChallengeList } from "./ChallengeList";

export const metadata: Metadata = { title: "Défis" };

async function ChallengesData() {
  await pageUser("/defis");
  return <ChallengeList challenges={await listChallenges()} />;
}

export default function ChallengesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des défis…</p>}>
      <ChallengesData />
    </Suspense>
  );
}
