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
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("suite"));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const me = await api<{ locale: "fr" | "en" }>("/api/auth/login", { body: { email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") } });
      // The language chosen on the account wins over the page the member signed in from.
      const english = /^\/en(\/|$)/.test(window.location.pathname);
      // A full load starts this member's session with nothing left from a previous one.
      hardNavigate(me.locale === "en" && !english ? `/en${next}` : next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/bienvenue"
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
              <Link href="/inscription" className="font-extrabold text-brand-text no-underline">
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
            labelAside={
              <Link href="/mot-de-passe-oublie" className="text-sm font-extrabold text-brand-text no-underline">
                {t("forgot")}
              </Link>
            }
          />
          {error && (
            <Alert tone="danger" role="alert">
              {error}
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
