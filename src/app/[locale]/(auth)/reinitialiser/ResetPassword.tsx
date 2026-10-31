"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { hardNavigate } from "@/lib/hard-navigate";

/** Screen A9: the rules turn green as the member types. */
export function ResetPassword() {
  const t = useTranslations("auth.reset");
  const token = useSearchParams().get("jeton") ?? "";
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rules = [
    { label: t("ruleLength"), ok: p1.length >= 12 },
    { label: t("ruleSame"), ok: p1.length > 0 && p1 === p2 },
  ];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rules.every((r) => r.ok)) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password/reset", { body: { token, password: p1 } });
      hardNavigate("/accueil");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/connexion"
        heading={t("heading")}
        title={t("title")}
        lead={t("lead")}
        footer={
          <Button type="submit" size="lg" block disabled={busy || !token || !rules.every((r) => r.ok)}>
            {busy ? t("busy") : t("submit")}
          </Button>
        }
      >
        {!token && <Alert tone="danger">{t("incomplete")}</Alert>}
        <PasswordField id="password" name="password" label={t("password")} autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
        <PasswordField id="confirm" name="confirm" label={t("confirm")} autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
        <ul aria-label={t("rules")} className="m-0 grid list-none gap-2.5 rounded-action border-2 border-line-strong bg-raised px-4 py-3.5">
          {rules.map((r) => (
            <li key={r.label} className={cn("flex items-center gap-2.5 text-sm font-bold", r.ok ? "text-success" : "text-muted")}>
              <span aria-hidden="true" className={cn("grid size-5.5 shrink-0 place-items-center rounded-full border-2", r.ok ? "border-success bg-success text-on-success" : "border-subtle")}>
                {r.ok && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                )}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
