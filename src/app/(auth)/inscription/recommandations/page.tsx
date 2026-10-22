import type { Metadata } from "next";
import { Suspense } from "react";
import { recommendations } from "@/server/members";
import { pageUser } from "@/server/page";
import { Recommendations } from "./Recommendations";

export const metadata: Metadata = { title: "Des développeurs à rencontrer" };

async function RecommendationsData() {
  const user = await pageUser("/inscription/recommandations");
  return <Recommendations people={await recommendations(user.id)} />;
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <RecommendationsData />
    </Suspense>
  );
}
