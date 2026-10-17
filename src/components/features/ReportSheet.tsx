"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { Checkbox, RadioCard, TextArea } from "@/components/ui/Field";

const REASONS = ["Spam ou arnaque", "Harcèlement ou propos haineux", "Faux profil ou faux statut Senior", "Plagiat dans un défi", "Autre"];

/** Report a message or a profile. A moderator reviews it within 24 h; the reporter stays anonymous. */
export function ReportSheet({ open, onClose, subject }: { open: boolean; onClose: () => void; subject: string }) {
  const [reason, setReason] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setSent(false);
      setReason(null);
      setError(false);
    }, 200);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={sent ? "Merci pour votre signalement" : `Signaler ${subject}`}
      footer={
        sent ? (
          <Button size="lg" block variant="secondary" onClick={close}>
            Fermer
          </Button>
        ) : (
          <Button
            size="lg"
            block
            variant="danger"
            onClick={() => {
              if (!reason) return setError(true);
              setSent(true);
            }}
          >
            Envoyer le signalement
          </Button>
        )
      }
    >
      {sent ? (
        <Alert tone="success" role="status">
          Un modérateur l’examine sous 24 h. Vous recevrez une notification avec sa décision.
        </Alert>
      ) : (
        <>
          <fieldset className="grid gap-1.5">
            <legend className="mb-2 text-sm font-bold">Quel est le problème ?</legend>
            {REASONS.map((r) => (
              <RadioCard key={r} name="reason" value={r} checked={reason === r} onChange={() => { setReason(r); setError(false); }} heading={<span className="font-normal">{r}</span>} className="py-2.5" />
            ))}
            {error && <span className="text-sm font-bold text-danger">Choisissez un motif.</span>}
          </fieldset>
          <TextArea id="report-details" label="Précisions (facultatif)" rows={3} placeholder="Ce qui s’est passé, en quelques mots" />
          <Checkbox defaultChecked>Bloquer aussi cette personne</Checkbox>
          <p className="text-xs text-muted">Un modérateur examine chaque signalement sous 24 h. La personne n’est pas informée de votre identité.</p>
        </>
      )}
    </Sheet>
  );
}
