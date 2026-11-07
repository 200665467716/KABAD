"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/**
 * The mentor accepts a request (then sees the confirmed session, M7), or declines it after a
 * confirmation sheet, with an optional reason (screen M6).
 */
export function AnswerRequest({ id, name, block }: { id: string; name: string; block?: boolean }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const first = name.split(" ")[0];

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/bookings/${id}`, { body: accept ? { accept } : { accept, reason: reason.trim() || undefined } });
      if (accept) {
        router.push(`/mentorat/seances/${id}`);
        return;
      }
      setDeclining(false);
      setDeclined(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (declined) {
    return (
      <p role="status" className="text-sm font-bold text-muted">
        {t("requests.declined", { name: first })}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {error && !declining && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" size={block ? "lg" : "md"} onClick={() => setDeclining(true)} disabled={busy}>
          {t("requests.decline")}
        </Button>
        <Button size={block ? "lg" : "md"} onClick={() => answer(true)} disabled={busy}>
          {t("requests.accept")}
        </Button>
      </div>
      <ConfirmSheet
        open={declining}
        onClose={() => setDeclining(false)}
        title={t("requests.declineTitle", { name: first })}
        text={t("requests.declineText", { name: first })}
        confirm={t("requests.decline")}
        busy={busy}
        onConfirm={() => answer(false)}
      >
        <TextField id={`reason-${id}`} label={t("requests.declineReason")} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </ConfirmSheet>
    </div>
  );
}
