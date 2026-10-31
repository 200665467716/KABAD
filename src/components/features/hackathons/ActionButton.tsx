"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";

/**
 * One API call behind a button, with an optional confirmation step. The page is refreshed
 * afterwards, or the member is sent to `then`.
 */
export function ActionButton({
  url,
  method = "POST",
  body,
  children,
  confirm,
  variant = "secondary",
  size = "md",
  block,
  then,
}: {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  children: ReactNode;
  confirm?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  then?: string;
}) {
  const t = useTranslations("hackathons.actions");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await api(url, { method, body });
      setAsking(false);
      if (then) router.push(then);
      else router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {asking ? (
        <div className="grid gap-2 rounded-action border-2 border-line-strong bg-bg p-3 text-sm">
          <p>{confirm}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAsking(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={run} disabled={busy}>
              {busy ? "…" : t("confirm")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant={variant} size={size} block={block} disabled={busy} onClick={() => (confirm ? setAsking(true) : run())}>
          {busy ? "…" : children}
        </Button>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </div>
  );
}
