"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Until the API exists, a few actions (confirming a session, accepting an invitation…)
 * are kept in the browser so that the screens stay consistent with each other.
 * Storage may be unavailable (private mode); the app then simply forgets on reload.
 */
const PREFIX = "kabad-demo:";
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    memory.set(key, value);
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** A list of ids persisted in the browser (e.g. confirmed session ids). */
export function useDemoList(key: string): [string[], (id: string) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  const add = useCallback(
    (id: string) => {
      const current: string[] = JSON.parse(read(key) ?? "[]");
      if (!current.includes(id)) write(key, JSON.stringify([...current, id]));
    },
    [key],
  );
  return [list, add];
}
