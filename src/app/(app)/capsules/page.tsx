import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { listCapsules } from "@/server/capsules";
import { pageUser } from "@/server/page";
import { CapsuleList } from "./CapsuleList";

export const metadata: Metadata = { title: "Capsules" };

async function CapsulesData() {
  const user = await pageUser("/capsules");
  const canPublish = user.role === "SENIOR" && user.seniorVerifiedAt !== null;
  return (
    <>
      <TopBar
        back="/mentorat"
        title="Capsules"
        actions={
          canPublish ? (
            <ButtonLink href="/capsules/nouvelle" size="sm" icon="plus">
              Publier
            </ButtonLink>
          ) : undefined
        }
      />
      <CapsuleList capsules={await listCapsules()} />
    </>
  );
}

export default function CapsulesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des capsules…</p>}>
      <CapsulesData />
    </Suspense>
  );
}
