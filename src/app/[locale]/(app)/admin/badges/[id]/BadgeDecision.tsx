"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

/** Grant the badge, or refuse it with a reason sent to the candidate. */
export function BadgeDecision({ id }: { id: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/badges/${id}`, { body: approve ? { approve } : { approve, reason } });
      router.push("/admin/badges");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
      setBusy(false);
    }
  }

  return (
    <ActionBar>
      {refusing && (
        <TextArea
          id="refusal"
          label={
            <>
              {t("badges.refusalLabel")} <span className="font-semibold text-muted">{t("badges.refusalHint")}</span>
            </>
          }
          rows={3}
          value={reason}
          maxLength={500}
          placeholder={t("badges.refusalPlaceholder")}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {refusing ? (
          <>
            <Button variant="secondary" onClick={() => setRefusing(false)} disabled={busy}>
              {t("badges.cancel")}
            </Button>
            <Button variant="danger" onClick={() => decide(false)} disabled={busy || reason.trim().length < 3}>
              {t("badges.sendRefusal")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setRefusing(true)} disabled={busy}>
              {t("badges.refuse")}
            </Button>
            <Button onClick={() => decide(true)} disabled={busy}>
              {t("badges.approve")}
            </Button>
          </>
        )}
      </div>
    </ActionBar>
  );
}
