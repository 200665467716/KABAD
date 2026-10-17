import type { Metadata } from "next";
import { Suspense } from "react";
import { ChallengeList } from "./ChallengeList";

export const metadata: Metadata = { title: "Défis" };

export default function ChallengesPage() {
  return (
    <Suspense>
      <ChallengeList />
    </Suspense>
  );
}
