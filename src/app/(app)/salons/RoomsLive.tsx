"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "@/lib/realtime-client";

/** Refreshes the list when a room this member follows goes live or ends. */
export function RoomsLive() {
  const router = useRouter();
  useRealtime("room:changed", () => router.refresh());
  useRealtime("notification:new", () => router.refresh());
  return null;
}
