import type { Metadata } from "next";
import { Suspense } from "react";
import { listTestApps } from "@/server/community-tests";
import { pageUser } from "@/server/page";
import { TestList } from "./TestList";

export const metadata: Metadata = { title: "Tests" };

async function TestsData() {
  const user = await pageUser("/tests");
  const { toTest, mine } = await listTestApps(user.id);
  return <TestList toTest={toTest} mine={mine} />;
}

export default function TestsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des tests…</p>}>
      <TestsData />
    </Suspense>
  );
}
