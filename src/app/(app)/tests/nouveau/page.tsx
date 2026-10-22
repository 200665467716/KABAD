import type { Metadata } from "next";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { TestAppForm } from "./TestAppForm";

export const metadata: Metadata = { title: "Faire tester mon app" };

async function Gate() {
  await pageUser("/tests/nouveau");
  return <TestAppForm />;
}

export default function NewTestAppPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <Gate />
    </Suspense>
  );
}
