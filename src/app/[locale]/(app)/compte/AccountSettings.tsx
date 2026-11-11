"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { Link, useRouter } from "@/i18n/navigation";
import { Page } from "@/components/shell/TopBar";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Alert, Avatar, Card, Overline } from "@/components/ui/Display";
import { Checkbox, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { disconnectRealtime } from "@/lib/realtime-client";
import { hardNavigate } from "@/lib/hard-navigate";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <Overline as="h2">{title}</Overline>
      <Card className="gap-3">{children}</Card>
    </section>
  );
}

type Blocked = { id: string; name: string; city: string; since: string };

export function AccountSettings({
  email,
  hasPassword,
  verified,
  profileId,
  blocked,
  emailNotifications,
}: {
  email: string;
  hasPassword: boolean;
  verified: boolean;
  profileId: string;
  blocked: Blocked[];
  emailNotifications: boolean;
}) {
  const t = useTranslations("profile.account");
  const router = useRouter();
  const [msg, setMsg] = useState<{ key: string; tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mails, setMails] = useState(emailNotifications);

  async function run(key: string, call: () => Promise<unknown>, ok: string, after?: () => void) {
    setBusy(key);
    setMsg(null);
    try {
      await call();
      setMsg({ key, tone: "success", text: ok });
      after?.();
    } catch (e) {
      setMsg({ key, tone: "danger", text: e instanceof ApiError ? e.message : t("failed") });
    } finally {
      setBusy(null);
    }
  }
  const note = (key: string) =>
    msg?.key === key && (
      <Alert tone={msg.tone} role={msg.tone === "danger" ? "alert" : "status"}>
        {msg.text}
      </Alert>
    );

  function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    run("password", () => api("/api/me/password", { body: { current: String(data.get("current") ?? ""), next: String(data.get("next") ?? "") } }), t("passwordChanged"), () => form.reset());
  }

  function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    run("delete", () => api("/api/me", { method: "DELETE", body: { password: String(data.get("password") ?? "") || undefined, confirm: String(data.get("confirm") ?? "") } }), t("deleted"), () => {
      disconnectRealtime();
      hardNavigate("/");
    });
  }

  return (
    <Page narrow>
      <Section title={t("language")}>
        <p className="text-sm text-muted">{t("languageText")}</p>
        <LanguageSwitcher />
      </Section>

      <Section title={t("email")}>
        <p className="text-sm">
          <b>{email}</b> · {verified ? t("verified") : t("unverified")}
        </p>
        {!verified && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/verifier-email" size="sm" className="justify-self-start">
              {t("verifyNow")}
            </ButtonLink>
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run("verify", () => api("/api/auth/verify/resend", { method: "POST" }), t("resent"))}>
              {t("resend")}
            </Button>
          </div>
        )}
        {note("verify")}
        <Checkbox
          checked={mails}
          disabled={busy !== null}
          onChange={(e) => {
            const on = e.target.checked;
            setMails(on);
            run("mails", () => api("/api/me/preferences", { method: "PUT", body: { emailNotifications: on } }), on ? t("mailsOn") : t("mailsOff"));
          }}
        >
          {t("mails")}
        </Checkbox>
        <p className="text-[13px] text-muted">{t("mailsHint")}</p>
        {note("mails")}
      </Section>

      <Section title={hasPassword ? t("changePassword") : t("choosePassword")}>
        <form onSubmit={changePassword} className="grid gap-3" noValidate>
          {hasPassword && <TextField id="current" name="current" type="password" label={t("current")} autoComplete="current-password" />}
          <TextField id="next" name="next" type="password" label={t("next")} autoComplete="new-password" hint={t("nextHint")} />
          <Button type="submit" size="sm" className="justify-self-start" disabled={busy !== null}>
            {t("save")}
          </Button>
          {note("password")}
        </form>
      </Section>

      <Section title={t("sessions")}>
        <p className="text-sm text-muted">{t("sessionsText")}</p>
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          disabled={busy !== null}
          onClick={() =>
            run("sessions", () => api("/api/auth/logout-all", { method: "POST" }), t("signedOutAll"), () => {
              disconnectRealtime();
              hardNavigate("/connexion");
            })
          }
        >
          {t("signOutAll")}
        </Button>
        {note("sessions")}
      </Section>

      <Section title={t("blocked")}>
        {blocked.length === 0 ? (
          <p className="text-sm text-muted">{t("blockedNone")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {blocked.map((b) => (
              <li key={b.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <Avatar initials={initials(b.name)} size="sm" />
                <Link href={`/profil/${b.id}`} className="text-sm font-bold text-ink no-underline">
                  {b.name}
                </Link>
                <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("blocks", () => api(`/api/blocks/${b.id}`, { method: "DELETE" }), t("unblocked", { name: b.name }), () => router.refresh())}>
                  {t("unblock")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {note("blocks")}
      </Section>

      <Section title={t("data")}>
        <p className="text-sm text-muted">{t("dataText")}</p>
        {/* A plain link: the API is not under the /en prefix. */}
        <a href="/api/me/export" download className={buttonClass({ variant: "secondary", size: "sm", className: "justify-self-start no-underline" })}>
          {t("download")}
        </a>
        <ButtonLink href={`/profil/${profileId}`} variant="ghost" size="sm" className="justify-self-start">
          {t("public")}
        </ButtonLink>
      </Section>

      <Section title={t("delete")}>
        <form onSubmit={deleteAccount} className="grid gap-3" noValidate>
          <p className="text-sm text-muted">{t("deleteText")}</p>
          {hasPassword && <TextField id="del-password" name="password" type="password" label={t("deletePassword")} autoComplete="current-password" />}
          <TextField id="confirm" name="confirm" label={t("deleteConfirm")} autoComplete="off" />
          <Button type="submit" variant="danger" size="sm" className="justify-self-start" disabled={busy !== null}>
            {t("deleteButton")}
          </Button>
          {note("delete")}
        </form>
      </Section>
    </Page>
  );
}
