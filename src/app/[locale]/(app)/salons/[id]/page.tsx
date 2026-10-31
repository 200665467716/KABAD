import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { getRoom } from "@/server/rooms";
import { RoomView } from "./RoomView";

export const metadata: Metadata = { title: "Salon vocal" };

async function RoomData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/salons/${id}`);
  const room = await orNotFound(getRoom(user.id, id));
  if (!room) notFound();
  return <RoomView initial={room} me={{ id: user.id, name: user.name }} />;
}

export default function RoomPage({ params }: PageProps<"/[locale]/salons/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement du salon…</p>}>
      <RoomData params={params} />
    </Suspense>
  );
}
