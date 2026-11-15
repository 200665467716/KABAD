"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { AddToCalendar } from "@/components/features/AddToCalendar";
import { api, ApiError } from "@/lib/api";
import type { CalendarEvent } from "@/lib/calendar";

export function SessionActions({ id, cancellable, calendar }: { id: string; cancellable: boolean; calendar: Omit<CalendarEvent, "id"> | null }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/bookings/${id}`, { method: "DELETE" });
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {calendar && <AddToCalendar event={{ id, ...calendar }} />}
      {cancellable && (
        <Button variant="ghost" block onClick={() => setConfirming(true)} disabled={busy}>
          {t("session.cancel")}
        </Button>
      )}
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("session.cancelTitle")}
        text={t("session.cancelText")}
        cancel={t("session.keep")}
        confirm={t("session.cancelConfirm")}
        busy={busy}
        onConfirm={cancel}
      />
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </>
  );
}

/** « Copier le lien » next to the Google Meet link (M7). */
export function CopyLink({ url }: { url: string }) {
  const t = useTranslations("mentoring.session");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
      }}
    >
      <span role="status">{copied ? t("copied") : t("copy")}</span>
    </Button>
  );
}
