"use client";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { hardNavigate } from "@/lib/hard-navigate";
import { disconnectRealtime } from "@/lib/realtime-client";

export function SignOutButton({ label }: { label: string }) {
  return (
    <Button
      variant="secondary"
      icon="logout"
      block
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        disconnectRealtime();
        // A full page load clears everything the member had in memory.
        hardNavigate("/connexion");
      }}
    >
      {label}
    </Button>
  );
}
