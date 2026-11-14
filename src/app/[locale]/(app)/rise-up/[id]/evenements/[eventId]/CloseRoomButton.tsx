"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** "room": a live room; "end": a scheduled event that is live; "cancel": a scheduled event not started yet. */
export type CloseMode = "room" | "end" | "cancel";

/**
 * Closes a live room or event: it leaves the « en direct » band of the project. The Meet call itself ends on Google's side.
 * Before it starts, the same action cancels the event: its reminder is not sent.
 */
export function CloseRoomButton({ projectId, eventId, mode }: { projectId: string; eventId: string; mode: CloseMode }) {
  const t = useTranslations("rise.event");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rise/${projectId}/events/${eventId}/end`, { method: "POST" });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t(`${mode}.error`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={mode === "cancel" ? "ghost" : "secondary"} block onClick={() => setOpen(true)}>
        {t(`${mode}.action`)}
      </Button>
      {/* The confirm button names the action, so it is not mistaken for the sheet's « Fermer » cross. */}
      <ConfirmSheet open={open} onClose={() => setOpen(false)} onConfirm={close} title={t(`${mode}.title`)} text={t(`${mode}.text`)} confirm={t(`${mode}.action`)} cancel={mode === "cancel" ? t("cancel.keep") : undefined} busy={busy}>
        {error && <p className="text-sm font-extrabold text-danger">{error}</p>}
      </ConfirmSheet>
    </>
  );
}
