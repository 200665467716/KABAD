"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { PasswordField } from "@/components/features/auth/PasswordField";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { signupSchema } from "@/lib/schemas";
import { useErrorText } from "@/lib/use-error-text";

type Errors = Partial<Record<"name" | "email" | "password" | "terms" | "form", ReactNode>>;

/** Screen A2, step 1 of 5. */
export function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const router = useRouter();
  const say = useErrorText();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  // Consent is never pre-ticked, and « Continuer » stays off until it is given.
  const [accepted, setAccepted] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") };
    const next: Errors = {};
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= say(issue.message);
    if (!data.get("terms")) next.terms = t("termsRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await api("/api/auth/signup", { body: input });
      router.push("/verifier-email");
    } catch (err) {
      if (err instanceof ApiError && err.code === "email_taken") {
        // A2e: the e-mail already has an account, with a direct way to sign in.
        setErrors({
          email: (
            <>
              {err.message}{" "}
              <Link href="/connexion" className="text-danger underline">
                {t("signIn")}
              </Link>
            </>
          ),
        });
      } else if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setErrors({ form: err instanceof ApiError ? err.message : t("failed") });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/bienvenue"
        heading={t("heading")}
        step={1}
        title={t("title")}
        lead={t("lead")}
        footer={
          <>
            <Button type="submit" size="lg" block disabled={busy || !accepted}>
              {busy ? t("busy") : t("submit")}
            </Button>
            <p className="text-center text-sm">
              {t("already")}{" "}
              <Link href="/connexion" className="-my-3 inline-flex min-h-11 items-center font-extrabold text-brand-text no-underline">
                {t("signIn")}
              </Link>
            </p>
          </>
        }
      >
        <div className="grid gap-4.5">
          <TextField id="name" name="name" label={t("name")} autoComplete="name" error={errors.name} />
          <TextField id="email" name="email" type="email" label={t("email")} autoComplete="email" error={errors.email} />
          <PasswordField id="password" name="password" label={t("password")} autoComplete="new-password" hint={t("passwordHint")} error={errors.password} />
          <div className="grid gap-1">
            <Checkbox name="terms" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
              {t("termsBefore")}
              <Link href="/conditions" target="_blank" className="font-extrabold text-brand-text">
                {t("termsLink")}
              </Link>
              {t("termsAfter")}
            </Checkbox>
            {errors.terms && <span className="text-sm font-extrabold text-danger">{errors.terms}</span>}
          </div>
          {errors.form && (
            <Alert tone="danger" role="alert">
              {errors.form}
            </Alert>
          )}
        </div>
      </AuthFrame>
    </form>
  );
}
