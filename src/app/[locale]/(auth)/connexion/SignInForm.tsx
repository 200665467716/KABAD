"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { hardNavigate } from "@/lib/hard-navigate";
import { safeNext } from "@/lib/safe-next";

/** Screen A7. */
export function SignInForm({ demo }: { demo: boolean }) {
  const t = useTranslations("auth.signIn");
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // Wrong password (A7e): attempts left before the 15-minute block, shown under the field.
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("suite"));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setAttemptsLeft(null);
    try {
      const me = await api<{ locale: "fr" | "en" }>("/api/auth/login", { body: { email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") } });
      // The language chosen on the account wins over the page the member signed in from.
      const english = /^\/en(\/|$)/.test(window.location.pathname);
      // A full load starts this member's session with nothing left from a previous one.
      hardNavigate(me.locale === "en" && !english ? `/en${next}` : next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
      if (err instanceof ApiError && err.code === "bad_credentials" && err.details?.left !== undefined) setAttemptsLeft(err.details.left);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/"
        heading={t("heading")}
        title={t("title")}
        lead={t("lead")}
        footer={
          <>
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? t("busy") : t("submit")}
            </Button>
            <p className="text-center text-sm">
              {t("noAccount")}{" "}
              <Link href="/inscription" className="-my-3 inline-flex min-h-11 items-center font-extrabold text-brand-text no-underline">
                {t("create")}
              </Link>
            </p>
          </>
        }
      >
        <div className="grid gap-4.5">
          <TextField id="email" name="email" type="email" label={t("email")} autoComplete="email" required />
          <PasswordField
            id="password"
            name="password"
            label={t("password")}
            autoComplete="current-password"
            required
            error={attemptsLeft !== null ? (attemptsLeft > 0 ? t("wrongPassword", { count: attemptsLeft }) : t("wrongPasswordLast")) : undefined}
            labelAside={
              <Link href="/mot-de-passe-oublie" className="-my-3 inline-flex min-h-11 items-center text-sm font-extrabold text-brand-text no-underline">
                {t("forgot")}
              </Link>
            }
          />
          {error && (
            <Alert tone="danger" role="alert">
              {attemptsLeft !== null ? (
                <>
                  <b>{error}</b> {t("wrongHelp")}
                </>
              ) : (
                error
              )}
            </Alert>
          )}
          {demo && (
            <details className="rounded-action border-2 border-line-strong bg-raised px-4 py-3 text-sm">
              <summary className="cursor-pointer font-extrabold">{t("demoTitle")}</summary>
              <p className="mt-2 text-muted">{t("demoText")}</p>
            </details>
          )}
        </div>
      </AuthFrame>
    </form>
  );
}
