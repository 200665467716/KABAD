"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { useRealtime, useRealtimeReconnect } from "./realtime-client";

export type Me = { id: string; name: string; role: "JUNIOR" | "SENIOR"; city: string; isAdmin: boolean; emailVerified: boolean; unreadMessages: number; unreadNotifications: number };

const MeContext = createContext<{ me: Me | null; ready: boolean; refresh: () => void }>({ me: null, ready: false, refresh: () => {} });

/** Keeps the unread counts in the navigation up to date while the member is signed in. */
function LiveUnread({ refresh }: { refresh: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refresh, 300);
  }, [refresh]);
  useRealtime("message:new", soon);
  useRealtime("conversation:read", soon);
  useRealtime("conversation:changed", soon);
  useRealtime("notification:new", soon);
  useRealtimeReconnect(soon);
  return null;
}

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<Me>("/api/me")
      .then((d) => alive && setMe(d))
      .catch(() => alive && setMe(null))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <MeContext.Provider value={{ me, ready, refresh }}>
      {me && <LiveUnread refresh={refresh} />}
      {children}
    </MeContext.Provider>
  );
}

export const useMe = () => useContext(MeContext);
