"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";

/** The member confirms with a button: a link opened by a mail scanner does not use up the token. */
export function VerifyEmail() {
  const token = useSearchParams().get("jeton") ?? "";
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState("busy");
    setError(null);
    try {
      await api("/api/auth/verify", { body: { token } });
      setState("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La confirmation n’a pas abouti. Réessayez.");
      setState("idle");
    }
  }

  return (
    <AuthFrame
      back="/"
      title={state === "done" ? "Adresse confirmée" : "Confirmer mon adresse e-mail"}
      lead={state === "done" ? "Vous pouvez inviter des membres, écrire et participer." : "Un clic, et vous pourrez écrire aux autres membres."}
      footer={
        state === "done" ? (
          <ButtonLink href="/accueil" size="lg" block>
            Continuer
          </ButtonLink>
        ) : (
          <Button size="lg" block onClick={confirm} disabled={!token || state === "busy"}>
            {state === "busy" ? "Confirmation…" : "Confirmer mon adresse"}
          </Button>
        )
      }
    >
      {!token && <Alert tone="danger">Ce lien est incomplet. Ouvrez le lien reçu par e-mail en entier.</Alert>}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </AuthFrame>
  );
}
