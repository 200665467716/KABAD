"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { useOfflineRefresh, useRealtime, useRealtimeReconnect } from "./realtime-client";

export type Me = {
  id: string;
  name: string;
  role: "JUNIOR" | "SENIOR";
  level: "ASPIRANT" | "DEBUTANT" | "INTERMEDIAIRE" | "SENIOR";
  city: string;
  locale: "fr" | "en";
  isAdmin: boolean;
  /** Holds the mentor badge. */
  isMentor: boolean;
  /** Address of the profile photo, or null. */
  photo: string | null;
  emailVerified: boolean;
  unreadMessages: number;
  unreadNotifications: number;
};

/*
 * The signed-in member, kept outside React. Screens read it with useSyncExternalStore, whose server snapshot
 * is "nobody": while a streamed part of the page is being hydrated, React renders it exactly as the server
 * did, then updates it. Without this, the navigation could hydrate with the member already loaded and no
 * longer match the HTML sent by the server.
 */
type State = { me: Me | null; ready: boolean };
const EMPTY: State = { me: null, ready: false };
let state: State = EMPTY;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function load() {
  try {
    set({ me: await api<Me>("/api/me"), ready: true });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) set({ me: null, ready: true });
    else set({ ...state, ready: true });
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Keeps the unread counts in the navigation up to date while the member is signed in. */
function LiveUnread() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 300);
  }, []);
  useRealtime("message:new", soon);
  useRealtime("conversation:read", soon);
  useRealtime("conversation:changed", soon);
  useRealtime("notification:new", soon);
  useRealtimeReconnect(soon);
  // Without the realtime server, the counts are read again every 10 seconds.
  useOfflineRefresh(load, 10_000);
  // Back on the tab, the counts are read again: an event missed while away is caught up.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && soon();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [soon]);
  return null;
}

export function MeProvider({ children }: { children: ReactNode }) {
  const { me } = useMe();
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      {me && <LiveUnread />}
      {children}
    </>
  );
}

export function useMe() {
  const s = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  return { me: s.me, ready: s.ready, refresh: load };
}
