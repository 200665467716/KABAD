import type { Metadata } from "next";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { NewRoomForm } from "./NewRoomForm";

export const metadata: Metadata = { title: "Créer un salon" };

async function Gate() {
  const user = await pageUser("/salons/nouveau");
  return <NewRoomForm verified={user.emailVerifiedAt !== null} />;
}

export default function NewRoomPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <Gate />
    </Suspense>
  );
}
