"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** A lead approves the room a member proposed (it opens to the members for one hour), or refuses it (P5). */
export function AnswerRoom({ projectId, eventId }: { projectId: string; eventId: string }) {
  const t = useTranslations("rise.event");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rise/${projectId}/events/${eventId}/answer`, { body: { approve } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("answerError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="lg" block icon="check" disabled={busy} onClick={() => answer(true)}>
        {t("approve")}
      </Button>
      <Button variant="secondary" block disabled={busy} onClick={() => answer(false)}>
        {t("refuse")}
      </Button>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </>
  );
}
