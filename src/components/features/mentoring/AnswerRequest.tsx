"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** The mentor accepts a request, or declines it with an optional reason (screen M5). */
export function AnswerRequest({ id, block }: { id: string; block?: boolean }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/bookings/${id}`, { body: accept ? { accept } : { accept, reason: reason.trim() || undefined } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {declining && <TextField id={`reason-${id}`} label={t("requests.declineReason")} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {declining ? (
          <>
            <Button variant="secondary" size={block ? "lg" : "md"} onClick={() => setDeclining(false)} disabled={busy}>
              {t("requests.cancel")}
            </Button>
            <Button variant="danger" size={block ? "lg" : "md"} onClick={() => answer(false)} disabled={busy}>
              {t("requests.confirmDecline")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size={block ? "lg" : "md"} onClick={() => setDeclining(true)} disabled={busy}>
              {t("requests.decline")}
            </Button>
            <Button size={block ? "lg" : "md"} onClick={() => answer(true)} disabled={busy}>
              {t("requests.accept")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
