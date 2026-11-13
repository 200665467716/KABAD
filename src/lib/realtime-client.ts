"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { hardNavigate } from "./hard-navigate";
import type { ChatMessage } from "./messaging-types";

export type RealtimeEvents = {
  "message:new": (e: { conversationId: string; message: ChatMessage }) => void;
  "conversation:changed": (e: { conversationId: string }) => void;
  "conversation:read": (e: { conversationId: string }) => void;
  "notification:new": () => void;
  "room:changed": (e: { roomId: string }) => void;
  "invitation:new": (e: { invitationId: string }) => void;
  "invitation:answered": (e: { invitationId: string; accepted: boolean; conversationId: string | null }) => void;
};

let socket: Socket<RealtimeEvents> | null = null;

/** One socket per tab, shared by every screen. The token is fetched again on each reconnection. */
function getSocket() {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4001";
  socket = io(url, {
    transports: ["websocket", "polling"],
    auth: (cb) => {
      fetch("/api/realtime/token", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { token: string }) => cb({ token: d.token }))
        .catch(() => cb({}));
    },
  });
  // Le serveur ferme lui-même la connexion quand la session est retirée (suspension, déconnexion partout).
  // Si la session n'est plus valide, la page ouverte part vers la connexion sans attendre un rechargement.
  socket.on("disconnect", (reason) => {
    if (reason !== "io server disconnect") return;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => {
        if (r.status === 401) hardNavigate("/connexion");
      })
      .catch(() => {});
  });
  return socket;
}

/** Closes the socket at sign-out, so the next member using this tab never receives the previous one's events. */
export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

/** Subscribes to a realtime event while the component is mounted. */
export function useRealtime<E extends keyof RealtimeEvents>(event: E, handler: RealtimeEvents[E]) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const s = getSocket();
    const listener = ((...args: Parameters<RealtimeEvents[E]>) => (ref.current as (...a: unknown[]) => void)(...args)) as RealtimeEvents[E];
    // socket.io's typed overloads do not accept a generic event name; the cast keeps the public hook typed.
    (s as unknown as Socket).on(event as string, listener as (...args: unknown[]) => void);
    return () => {
      (s as unknown as Socket).off(event as string, listener as (...args: unknown[]) => void);
    };
  }, [event]);
}

/** Calls `onReconnect` after the socket comes back, so screens can catch up on what they missed. */
export function useRealtimeReconnect(onReconnect: () => void) {
  const ref = useRef(onReconnect);
  useEffect(() => {
    ref.current = onReconnect;
  });
  useEffect(() => {
    const s = getSocket();
    let first = true;
    const handler = () => {
      if (first) {
        first = false;
        return;
      }
      ref.current();
    };
    s.on("connect", handler);
    return () => {
      s.off("connect", handler);
    };
  }, []);
}
