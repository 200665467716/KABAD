"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/Controls";
import { api } from "@/lib/api";
import { hardNavigate } from "@/lib/hard-navigate";
import { disconnectRealtime } from "@/lib/realtime-client";

/** « Se déconnecter », confirmed in a sheet first (screen P1). */
export function SignOutButton({ label }: { label: string }) {
  const t = useTranslations("profile.me");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-self-center px-3 text-[15px] font-extrabold text-danger">
        {label}
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("signOutTitle")}
        text={t("signOutText")}
        cancel={t("signOutStay")}
        confirm={label}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          await api("/api/auth/logout", { method: "POST" }).catch(() => {});
          disconnectRealtime();
          // A full page load clears everything the member had in memory.
          hardNavigate("/connexion");
        }}
      />
    </>
  );
}
