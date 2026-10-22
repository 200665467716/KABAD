/*
 * LiveKit (self-hosted, Apache-2.0) carries the audio of voice rooms. KABAD decides who may speak:
 * the access token only allows publishing for the host and the speakers, and a speaker sent back
 * to the audience loses that right on the LiveKit server at once.
 *   LIVEKIT_URL             server address for the app (http://localhost:7880)
 *   NEXT_PUBLIC_LIVEKIT_URL address for browsers (ws://localhost:7880, wss:// in production)
 *   LIVEKIT_API_KEY, LIVEKIT_API_SECRET
 */
import { SignJWT } from "jose";
import { DomainError } from "./errors";

export type LivekitConfig = { url: string; key: string; secret: string; publicUrl: string };

export function livekitConfig(env: NodeJS.ProcessEnv = process.env): LivekitConfig | null {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL } = env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return null;
  return { url: LIVEKIT_URL.replace(/\/$/, ""), key: LIVEKIT_API_KEY, secret: LIVEKIT_API_SECRET, publicUrl: NEXT_PUBLIC_LIVEKIT_URL ?? LIVEKIT_URL.replace(/^http/, "ws") };
}

export const livekitRoomName = (roomId: string) => `kabad-${roomId}`;

type VideoGrant = { room?: string; roomJoin?: boolean; roomAdmin?: boolean; canPublish?: boolean; canSubscribe?: boolean; canPublishData?: boolean; canPublishSources?: string[] };

async function sign(config: LivekitConfig, claims: { sub?: string; name?: string; video: VideoGrant }, ttlSeconds: number) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(config.key)
    .setNotBefore(Math.floor(Date.now() / 1000) - 10)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(new TextEncoder().encode(config.secret));
}

/** A token to join one room for 2 hours. Audio only: no camera, no screen, no data messages. */
export async function joinToken(config: LivekitConfig, roomId: string, user: { id: string; name: string }, canSpeak: boolean) {
  return sign(
    config,
    {
      sub: user.id,
      name: user.name,
      video: { room: livekitRoomName(roomId), roomJoin: true, canSubscribe: true, canPublish: canSpeak, canPublishData: false, canPublishSources: ["microphone"] },
    },
    2 * 3600,
  );
}

/** Calls the LiveKit RoomService (Twirp over HTTP, JSON). A missing participant or room is not an error. */
async function roomService(config: LivekitConfig, method: string, roomId: string, body: Record<string, unknown>): Promise<unknown> {
  const token = await sign(config, { video: { room: livekitRoomName(roomId), roomAdmin: true } }, 60);
  let res: Response;
  try {
    res = await fetch(`${config.url}/twirp/livekit.RoomService/${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ room: livekitRoomName(roomId), ...body }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("LiveKit injoignable", e);
    throw new DomainError("audio_unavailable", "Le serveur audio ne répond pas. Réessayez dans un instant.", 502);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404 || /not.?found|does not exist/i.test(text)) return null;
    console.error("LiveKit a refusé", method, res.status, text);
    throw new DomainError("audio_unavailable", "Le serveur audio a refusé l’action. Réessayez.", 502);
  }
  return res.json().catch(() => null);
}

/** Identities connected to the room's audio right now. */
export async function connectedIdentities(c: LivekitConfig, roomId: string): Promise<Set<string>> {
  const out = (await roomService(c, "ListParticipants", roomId, {})) as { participants?: Array<{ identity: string }> } | null;
  return new Set((out?.participants ?? []).map((p) => p.identity));
}

export const setCanSpeak = (c: LivekitConfig, roomId: string, userId: string, canSpeak: boolean) =>
  roomService(c, "UpdateParticipant", roomId, { identity: userId, permission: { canSubscribe: true, canPublish: canSpeak, canPublishData: false, canPublishSources: canSpeak ? [2] : [] } });

export const removeFromLivekit = (c: LivekitConfig, roomId: string, userId: string) => roomService(c, "RemoveParticipant", roomId, { identity: userId });

export const closeLivekitRoom = (c: LivekitConfig, roomId: string) => roomService(c, "DeleteRoom", roomId, {});
