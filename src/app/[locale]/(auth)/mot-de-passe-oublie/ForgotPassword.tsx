"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

/** Screen A8. The answer is the same whether the address has an account or not. */
export function ForgotPassword() {
  const t = useTranslations("auth.forgot");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(email: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password/forgot", { body: { email } });
      setSentTo(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(String(new FormData(e.currentTarget).get("email") ?? "").trim());
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/connexion"
        heading={t("heading")}
        title={sentTo ? t("sentTitle") : t("title")}
        lead={sentTo ? t.rich("sentLead", { email: sentTo, b: (c) => <b className="text-ink">{c}</b> }) : t("lead")}
        footer={
          sentTo ? (
            <Button variant="secondary" size="lg" block disabled={busy} onClick={() => send(sentTo)}>
              {t("resend")}
            </Button>
          ) : (
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? t("busy") : t("submit")}
            </Button>
          )
        }
      >
        {sentTo ? (
          <Alert tone="success" role="status">
            {t("sentOk")}
          </Alert>
        ) : (
          <TextField id="email" name="email" type="email" label={t("email")} autoComplete="email" required />
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
