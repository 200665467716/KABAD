import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { CapsuleForm } from "./CapsuleForm";

export const metadata: Metadata = { title: "Publier une capsule" };

async function Gate() {
  const user = await pageUser("/capsules/nouvelle");
  if (user.role !== "SENIOR" || !user.seniorVerifiedAt) notFound();
  return <CapsuleForm />;
}

export default function NewCapsulePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <Gate />
    </Suspense>
  );
}
