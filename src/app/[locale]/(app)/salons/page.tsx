import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, CardLink, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { sessionWhen } from "@/lib/time";
import type { RoomSummary } from "@/lib/domain-types";
import { pageUser } from "@/server/page";
import { listRooms } from "@/server/rooms";
import { RoomsLive } from "./RoomsLive";

export const metadata: Metadata = { title: "Salons vocaux" };

function RoomCard({ r }: { r: RoomSummary }) {
  return (
    <CardLink href={`/salons/${r.id}`}>
      <div className="flex items-center justify-between gap-2">
        {r.status === "LIVE" ? (
          <Badge tone="danger" icon="radio">
            En direct
          </Badge>
        ) : r.status === "SCHEDULED" ? (
          <Badge tone="brand">{sessionWhen(r.startsAt)}</Badge>
        ) : (
          <Badge>Terminé</Badge>
        )}
        {r.status === "LIVE" && (
          <span className="flex items-center gap-1 text-sm text-muted tabular">
            <Icon name="users" size={16} />
            {r.listeners}
          </span>
        )}
        {r.status === "SCHEDULED" && r.interested > 0 && <span className="text-sm text-muted tabular">{r.interested} intéressé{r.interested > 1 ? "s" : ""}</span>}
      </div>
      <h2 className="font-display text-lg font-bold">{r.title}</h2>
      <p className="line-clamp-2 text-sm text-muted">{r.description}</p>
      <p className="text-sm">
        Animé par <b>{r.host.name}</b>
        {r.status === "LIVE" && r.speakers.length > 1 ? ` · avec ${r.speakers.filter((s) => s !== r.host.name).slice(0, 3).join(", ")}` : ""}
      </p>
    </CardLink>
  );
}

function Section({ id, title, rooms, empty }: { id: string; title: string; rooms: RoomSummary[]; empty?: string }) {
  if (rooms.length === 0 && !empty) return null;
  return (
    <section className="grid gap-2" aria-labelledby={id}>
      <Overline as="h2" id={id}>
        {title}
      </Overline>
      {rooms.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rooms.map((r) => (
            <RoomCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}

async function RoomsData() {
  const user = await pageUser("/salons");
  const { live, upcoming, ended } = await listRooms(user.id);
  return (
    <Page>
      <RoomsLive />
      <p className="text-sm text-muted">Des discussions en direct, à la voix : un hôte, quelques intervenants sur scène, et tout le monde peut écouter et lever la main.</p>
      <Section id="live" title="En direct" rooms={live} empty="Aucun salon en direct pour l’instant." />
      <Section id="upcoming" title="À venir" rooms={upcoming} empty="Aucun salon programmé. Lance le premier !" />
      <Section id="ended" title="Récemment terminés" rooms={ended} />
    </Page>
  );
}

export default function RoomsPage() {
  return (
    <>
      <TopBar
        title="Salons vocaux"
        actions={
          <ButtonLink href="/salons/nouveau" size="sm" icon="plus">
            Créer
          </ButtonLink>
        }
      />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des salons…</p>}>
        <RoomsData />
      </Suspense>
    </>
  );
}
