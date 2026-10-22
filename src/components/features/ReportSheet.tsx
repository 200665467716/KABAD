"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { Checkbox, RadioCard, TextArea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/schemas";

export type ReportTarget = { type: "USER" | "MESSAGE" | "CONVERSATION" | "INVITATION" | "ROOM"; id: string };

/** Report a member, a message, a conversation or an invitation. A moderator reviews it within 24 h; the reporter stays anonymous. */
export function ReportSheet({ open, onClose, subject, target, onBlocked }: { open: boolean; onClose: () => void; subject: string; target: ReportTarget; onBlocked?: () => void }) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [state, setState] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

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
    if (!reason) return setError("Choisissez un motif.");
    setState("sending");
    setError(null);
    try {
      await api("/api/reports", { body: { targetType: target.type, targetId: target.id, reason, details: details.trim() || undefined, block } });
      setState("sent");
      if (block) onBlocked?.();
    } catch (e) {
      setState("form");
      setError(e instanceof ApiError ? e.message : "Le signalement n’est pas parti. Réessayez.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={state === "sent" ? "Merci pour votre signalement" : `Signaler ${subject}`}
      footer={
        state === "sent" ? (
          <Button size="lg" block variant="secondary" onClick={close}>
            Fermer
          </Button>
        ) : (
          <Button size="lg" block variant="danger" onClick={submit} disabled={state === "sending"}>
            {state === "sending" ? "Envoi…" : "Envoyer le signalement"}
          </Button>
        )
      }
    >
      {state === "sent" ? (
        <Alert tone="success" role="status">
          L’équipe KABAD l’examine.{block ? " Cette personne ne peut plus vous écrire ni vous inviter." : ""}
        </Alert>
      ) : (
        <>
          <fieldset className="grid gap-1.5">
            <legend className="mb-2 text-sm font-bold">Quel est le problème ?</legend>
            {REPORT_REASONS.map((r) => (
              <RadioCard
                key={r}
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => {
                  setReason(r);
                  setError(null);
                }}
                heading={<span className="font-normal">{r}</span>}
                className="py-2.5"
              />
            ))}
          </fieldset>
          <TextArea id="report-details" label="Précisions (facultatif)" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ce qui s’est passé, en quelques mots" />
          <Checkbox checked={block} onChange={(e) => setBlock(e.target.checked)}>
            Bloquer aussi cette personne
          </Checkbox>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <p className="text-xs text-muted">Un modérateur examine chaque signalement sous 24 h. La personne n’est pas informée de votre identité.</p>
        </>
      )}
    </Sheet>
  );
}
