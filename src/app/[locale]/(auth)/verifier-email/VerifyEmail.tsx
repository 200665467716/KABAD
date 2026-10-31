"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

export function VerifyEmail({ token, email, verified }: { token: string; email: string | null; verified: boolean }) {
  const t = useTranslations("auth.verify");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">(verified && !token ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [address, setAddress] = useState(email);
  const [changing, setChanging] = useState(false);

  async function run(fn: () => Promise<unknown>, onDone?: () => void) {
    setState("busy");
    setError(null);
    setNotice(null);
    try {
      await fn();
      onDone?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
      setState("idle");
    }
  }

  // The link opened from the e-mail: confirmed with a button, so a mail scanner does not use up the token.
  if (token) {
    return (
      <AuthFrame
        back="/"
        heading={t("heading")}
        title={state === "done" ? t("doneTitle") : t("linkTitle")}
        lead={state === "done" ? t("doneLead") : t("linkLead")}
        footer={
          state === "done" ? (
            <ButtonLink href={email ? "/inscription/profil" : "/connexion"} size="lg" block>
              {t("continue")}
            </ButtonLink>
          ) : (
            <Button size="lg" block disabled={state === "busy"} onClick={() => run(() => api("/api/auth/verify", { body: { token } }), () => setState("done"))}>
              {state === "busy" ? t("busy") : t("linkSubmit")}
            </Button>
          )
        }
      >
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </AuthFrame>
    );
  }

  if (!email) {
    return (
      <AuthFrame back="/" heading={t("heading")} title={t("title")} lead={t("signInFirst")} footer={<ButtonLink href="/connexion?suite=/verifier-email" size="lg" block>{t("signIn")}</ButtonLink>}>
        <span />
      </AuthFrame>
    );
  }

  if (state === "done") {
    return (
      <AuthFrame back="/" heading={t("heading")} step={2} title={t("doneTitle")} lead={t("doneLead")} footer={<ButtonLink href="/inscription/profil" size="lg" block>{t("continue")}</ButtonLink>}>
        <span />
      </AuthFrame>
    );
  }

  function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return setError(t("codeFormat"));
    run(() => api("/api/auth/verify/code", { body: { code } }), () => router.push("/inscription/profil"));
  }

  function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = String(new FormData(e.currentTarget).get("newEmail") ?? "").trim();
    run(
      () => api("/api/auth/verify/email", { method: "PUT", body: { email: next } }),
      () => {
        setAddress(next);
        setChanging(false);
        setState("idle");
        setNotice(t("resent"));
      },
    );
  }

  return (
    <AuthFrame
      back="/inscription"
      heading={t("heading")}
      step={2}
      title={t("title")}
      lead={
        <>
          {t("sentTo")} <b className="text-ink">{address}</b>.
        </>
      }
      footer={
        changing ? (
          <Button type="submit" form="verify-email" size="lg" block disabled={state === "busy"}>
            {t("saveEmail")}
          </Button>
        ) : (
          <Button type="submit" form="verify-code" size="lg" block disabled={state === "busy"}>
            {state === "busy" ? t("busy") : t("submit")}
          </Button>
        )
      }
    >
      {changing ? (
        <form id="verify-email" onSubmit={submitEmail} noValidate className="grid gap-3">
          <TextField id="newEmail" name="newEmail" type="email" label={t("newEmail")} autoComplete="email" defaultValue={address ?? ""} />
          <Button variant="ghost" onClick={() => setChanging(false)} className="justify-self-start">
            {t("cancel")}
          </Button>
        </form>
      ) : (
        <form id="verify-code" onSubmit={submitCode} noValidate className="grid gap-5">
          <TextField
            id="code"
            name="code"
            label={t("code")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            inputClassName="h-16 text-center font-display text-3xl tracking-[0.4em]"
          />
          <div className="grid gap-2 rounded-action border-2 border-line-strong bg-raised p-4">
            <p className="font-extrabold">{t("nothing")}</p>
            <p className="text-sm text-muted">{t("nothingHelp")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={state === "busy"} onClick={() => run(() => api("/api/auth/verify/resend", { method: "POST" }), () => (setState("idle"), setNotice(t("resent"))))}>
                {t("resend")}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
                {t("change")}
              </Button>
            </div>
          </div>
        </form>
      )}
      {notice && (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </AuthFrame>
  );
}
