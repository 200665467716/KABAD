"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** Closes a live room: it leaves the « en direct » band of the project. The Meet call itself ends on Google's side. */
export function CloseRoomButton({ projectId, eventId }: { projectId: string; eventId: string }) {
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
      setError(e instanceof ApiError ? e.message : t("closeError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" block onClick={() => setOpen(true)}>
        {t("close")}
      </Button>
      <ConfirmSheet open={open} onClose={() => setOpen(false)} onConfirm={close} title={t("closeTitle")} text={t("closeText")} confirm={t("closeConfirm")} busy={busy}>
        {error && <p className="text-sm font-extrabold text-danger">{error}</p>}
      </ConfirmSheet>
    </>
  );
}
