"use client";

import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/Button";

/** Shown when a screen fails unexpectedly. The member can retry without losing the rest of the app. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-[480px] content-center justify-items-start gap-4 px-6 py-12">
      <h1 className="font-display text-2xl font-extrabold uppercase">{t("errors.errorTitle")}</h1>
      <p className="text-muted">{t("errors.errorText")}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>{t("common.retry")}</Button>
        <ButtonLink href="/accueil" variant="secondary">
          {t("common.home")}
        </ButtonLink>
      </div>
    </main>
  );
}
