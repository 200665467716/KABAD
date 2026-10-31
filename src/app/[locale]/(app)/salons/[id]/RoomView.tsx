"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, DisconnectReason, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { ReportSheet } from "@/components/features/ReportSheet";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, IconButton } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useRealtime } from "@/lib/realtime-client";
import { sessionWhen } from "@/lib/time";
import type { RoomDetail, RoomPerson } from "@/lib/domain-types";

type Audio = "off" | "connecting" | "on";

export function RoomView({ initial, me }: { initial: RoomDetail; me: { id: string; name: string } }) {
  const [room, setRoom] = useState(initial);
  const [audio, setAudio] = useState<Audio>("off");
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const lk = useRef<Room | null>(null);
  const sink = useRef<HTMLDivElement>(null);
  const isHost = room.me.role === "HOST";
  const onStage = room.me.role === "HOST" || room.me.role === "SPEAKER";

  const refresh = useCallback(async () => {
    try {
      setRoom(await api<RoomDetail>(`/api/rooms/${initial.id}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotice("Ce salon a été fermé.");
    }
  }, [initial.id]);
  useRealtime("room:changed", ({ roomId }) => roomId === initial.id && refresh());

  const disconnect = useCallback(() => {
    lk.current?.disconnect();
    lk.current = null;
    setAudio("off");
    setMicOn(false);
    setSpeaking(new Set());
  }, []);

  // Sent back to the audience: the microphone goes off on this side too.
  useEffect(() => {
    if (!onStage && micOn) {
      lk.current?.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors a role change decided by the host
      setMicOn(false);
    }
  }, [onStage, micOn]);

  // The room ended while connected.
  useEffect(() => {
    if (room.status === "ENDED" && lk.current) disconnect();
  }, [room.status, disconnect]);

  // Leaving the page leaves the room.
  useEffect(
    () => () => {
      if (lk.current) {
        lk.current.disconnect();
        fetch(`/api/rooms/${initial.id}/leave`, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => {});
      }
    },
    [initial.id],
  );

  async function join() {
    setError(null);
    setAudio("connecting");
    try {
      const { url, token } = await api<{ url: string; token: string }>(`/api/rooms/${initial.id}/join`, { method: "POST" });
      const r = new Room({ adaptiveStream: false, dynacast: false });
      r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) sink.current?.appendChild(track.attach());
      });
      r.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => track.detach().forEach((el) => el.remove()));
      r.on(RoomEvent.ActiveSpeakersChanged, (list: Participant[]) => setSpeaking(new Set(list.map((p) => p.identity))));
      r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        lk.current = null;
        setAudio("off");
        setMicOn(false);
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) setNotice("L’hôte t’a retiré de ce salon.");
        else if (reason === DisconnectReason.ROOM_DELETED) setNotice("Le salon est terminé.");
        refresh();
      });
      await r.connect(url, token);
      // Browsers only play sound after a gesture: this click is the gesture.
      await r.startAudio();
      lk.current = r;
      setAudio(r.state === ConnectionState.Connected ? "on" : "off");
      refresh();
    } catch (e) {
      setAudio("off");
      setError(e instanceof ApiError ? e.message : "Connexion audio impossible. Vérifie ton réseau et réessaie.");
    }
  }

  async function leave() {
    disconnect();
    await api(`/api/rooms/${initial.id}/leave`, { method: "POST" }).catch(() => {});
    refresh();
  }

  async function toggleMic() {
    const r = lk.current;
    if (!r) return;
    try {
      await r.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch {
      setError("Le micro n’est pas accessible. Autorise-le dans ton navigateur.");
    }
  }

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rooms/${initial.id}/${path}`, { method: "POST", body });
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’action n’a pas abouti.");
    } finally {
      setBusy(false);
    }
  }

  const person = (p: RoomPerson, big: boolean) => {
    const talking = speaking.has(p.id);
    return (
      <li key={p.id} className="grid justify-items-center gap-1 text-center">
        <span className={cn("rounded-full p-0.5", talking ? "ring-3 ring-success" : "ring-3 ring-transparent")}>
          <Avatar initials={initials(p.name)} size={big ? "lg" : "md"} tone={p.role === "HOST" ? "accent" : "brand"} />
        </span>
        <span className="max-w-[88px] truncate text-xs font-bold">
          {p.id === me.id ? "Toi" : p.name.split(" ")[0]}
          {p.handRaised && (
            <span aria-label="a levé la main" role="img">
              {" "}
              <Icon name="hand" size={16} className="inline text-accent-text" />
            </span>
          )}
        </span>
        {p.role === "HOST" && <span className="text-[11px] text-muted">Hôte</span>}
        {talking && <span className="sr-only">parle</span>}
        {isHost && p.id !== me.id && room.status === "LIVE" && (
          <span className="flex flex-wrap justify-center gap-1">
            <button type="button" disabled={busy} className="text-[11px] font-bold text-brand-text" onClick={() => act("speakers", { userId: p.id, speak: p.role === "LISTENER" })}>
              {p.role === "LISTENER" ? "Sur scène" : "Auditoire"}
            </button>
            <button type="button" disabled={busy} className="text-[11px] font-bold text-danger" onClick={() => act("remove", { userId: p.id })} aria-label={`Retirer ${p.name} du salon`}>
              Retirer
            </button>
          </span>
        )}
      </li>
    );
  };

  return (
    <>
      <TopBar back="/salons" title={room.title} subtitle={`Animé par ${room.host.name}`} actions={!isHost ? <IconButton icon="flag" label="Signaler le salon" onClick={() => setReport(true)} /> : undefined} />
      <Page narrow className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {room.status === "LIVE" ? (
            <Badge tone="danger" icon="radio">
              En direct
            </Badge>
          ) : room.status === "SCHEDULED" ? (
            <Badge tone="brand">{sessionWhen(room.startsAt)}</Badge>
          ) : (
            <Badge>Terminé</Badge>
          )}
          <span className="text-sm text-muted">
            {room.stage.length + room.audience.length} présent{room.stage.length + room.audience.length > 1 ? "s" : ""}
          </span>
        </div>
        <p>{room.description}</p>
        {notice && (
          <Alert tone="info" role="status">
            {notice}
          </Alert>
        )}

        {room.status !== "SCHEDULED" && (
          <>
            <section aria-labelledby="stage" className="grid gap-3">
              <Overline as="h2" id="stage">
                Sur scène
              </Overline>
              <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 sm:grid-cols-4">{room.stage.map((p) => person(p, true))}</ul>
            </section>
            <section aria-labelledby="audience" className="grid gap-3">
              <Overline as="h2" id="audience">
                Auditoire ({room.audience.length})
              </Overline>
              {room.audience.length === 0 ? <p className="text-sm text-muted">Personne dans l’auditoire pour l’instant.</p> : <ul className="m-0 grid list-none grid-cols-4 gap-3 p-0 sm:grid-cols-6">{room.audience.map((p) => person(p, false))}</ul>}
            </section>
          </>
        )}
        {room.status === "SCHEDULED" && !isHost && (
          <p className="text-sm text-muted">Le salon commence {sessionWhen(room.startsAt).toLowerCase()}. Demande un rappel : tu seras prévenu dès qu’il est en direct.</p>
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
        <p className="text-xs text-muted">
          Audio en direct, non enregistré. Reste bienveillant :{" "}
          <Link href="/salons" className="text-muted">
            tout salon peut être signalé à l’équipe
          </Link>
          .
        </p>
        <div ref={sink} hidden />
      </Page>

      <ActionBar className="flex flex-wrap items-center justify-center gap-2">
        {room.status === "SCHEDULED" ? (
          isHost ? (
            <>
              <Button size="lg" icon="radio" onClick={() => act("start")} disabled={busy}>
                Passer en direct
              </Button>
              <Button variant="ghost" onClick={() => act("end")} disabled={busy}>
                Annuler le salon
              </Button>
            </>
          ) : (
            <Button size="lg" variant={room.remindMe ? "secondary" : "primary"} icon={room.remindMe ? "check" : "bell"} onClick={() => act("remind")} disabled={busy}>
              {room.remindMe ? "Rappel demandé" : "Me prévenir"}
            </Button>
          )
        ) : room.status === "ENDED" ? (
          <Button variant="secondary" size="lg" onClick={() => history.back()}>
            Retour
          </Button>
        ) : audio === "off" ? (
          <Button size="lg" icon="radio" onClick={join} disabled={room.me.removed}>
            {room.me.removed ? "Tu as été retiré" : "Rejoindre le salon"}
          </Button>
        ) : (
          <>
            {onStage ? (
              <Button variant={micOn ? "primary" : "secondary"} icon={micOn ? "mic" : "micOff"} onClick={toggleMic} disabled={audio !== "on"}>
                {micOn ? "Micro ouvert" : "Micro coupé"}
              </Button>
            ) : (
              <Button variant={room.me.handRaised ? "accent" : "secondary"} icon="hand" onClick={() => act("hand", { up: !room.me.handRaised })} disabled={busy || audio !== "on"}>
                {room.me.handRaised ? "Main levée" : "Lever la main"}
              </Button>
            )}
            {isHost ? (
              <Button variant="danger" onClick={() => act("end").then(disconnect)} disabled={busy}>
                Terminer le salon
              </Button>
            ) : (
              <Button variant="ghost" onClick={leave}>
                Quitter
              </Button>
            )}
          </>
        )}
        {audio === "connecting" && <span className="w-full text-center text-sm text-muted">Connexion à l’audio…</span>}
      </ActionBar>
      <ReportSheet open={report} onClose={() => setReport(false)} subject="ce salon" target={{ type: "ROOM", id: room.id }} />
    </>
  );
}
