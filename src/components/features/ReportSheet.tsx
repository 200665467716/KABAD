"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { Checkbox, RadioCard, TextArea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/schemas";

export type ReportTarget = { type: "USER" | "MESSAGE" | "CONVERSATION" | "INVITATION" | "ROOM" | "RISE_POST"; id: string };

/**
 * Report a member, a message, a conversation, an invitation or a Rise-Up post. A moderator reviews it within 24 h;
 * the reporter stays anonymous. `hides`: a lead of a Rise-Up project hides the post at once by reporting it,
 * with a reason that the KABAD team reads (P5); `onSent` then refreshes the page.
 */
export function ReportSheet({ open, onClose, subject, target, onBlocked, hides, onSent }: { open: boolean; onClose: () => void; subject: string; target: ReportTarget; onBlocked?: () => void; hides?: boolean; onSent?: () => void }) {
  const t = useTranslations("messaging.report");
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);
  // Deux feuilles de signalement vivent sur la même page (conversation et message) : chacune son identifiant.
  const detailsId = useId();

  const close = () => {
    onClose();
    setTimeout(() => {
      setState("form");
      setReason(null);
      setDetails("");
      setError(null);
    }, 200);
  };

  async function submit() {
    if (!reason) return setError(t("chooseReason"));
    if (hides && details.trim().length < 10) return setError(t("reasonRequired"));
    setState("sending");
    setError(null);
    try {
      await api("/api/reports", { body: { targetType: target.type, targetId: target.id, reason, details: details.trim() || undefined, block } });
      setState("sent");
      if (block) onBlocked?.();
      onSent?.();
    } catch (e) {
      setState("form");
      setError(e instanceof ApiError ? e.message : t("error"));
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={state === "sent" ? t("thanks") : t("title", { subject })}
      footer={
        state === "sent" ? (
          <Button size="lg" block variant="secondary" onClick={close}>
            {t("close")}
          </Button>
        ) : (
          <Button size="lg" block variant="danger" onClick={submit} disabled={state === "sending"}>
            {state === "sending" ? t("sending") : t("send")}
          </Button>
        )
      }
    >
      {state === "sent" ? (
        <Alert tone="success" role="status">
          {hides ? t("doneHidden") : t("done")}
          {block ? ` ${t("doneBlocked")}` : ""}
        </Alert>
      ) : (
        <>
          <fieldset className="grid gap-1.5">
            <legend className="mb-2 text-sm font-extrabold">{t("question")}</legend>
            {REPORT_REASONS.map((r, i) => (
              <RadioCard
                key={r}
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => {
                  setReason(r);
                  setError(null);
                }}
                heading={<span className="font-semibold">{t(`reasons.r${i}` as "reasons.r0")}</span>}
                className="py-2.5"
              />
            ))}
          </fieldset>
          {hides && (
            <Alert tone="info">
              {t("leadNotice")}
            </Alert>
          )}
          <TextArea id={detailsId} label={hides ? t("reasonLabel") : t("details")} rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t("detailsPlaceholder")} />
          <Checkbox checked={block} onChange={(e) => setBlock(e.target.checked)}>
            {t("block")}
          </Checkbox>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <p className="text-xs text-muted">{t("footnote")}</p>
        </>
      )}
    </Sheet>
  );
}
