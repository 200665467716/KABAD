"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";

/** Passe de /accueil à /en/accueil (et inversement) en gardant la page et ses paramètres. */
export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    // Lu au clic plutôt qu'avec useSearchParams : le sélecteur reste dans la partie pré-rendue de la page.
    const query = window.location.search.slice(1);
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { locale: next }));
    // Remembered on the account when signed in, so the language follows the member across devices.
    api("/api/me/locale", { method: "PUT", body: { locale: next } }).catch(() => {});
  }

  return (
    <div role="group" aria-label={t("label")} className={cn("inline-flex items-center gap-1", pending && "opacity-60", className)}>
      {!compact && <Icon name="globe" size={18} className="mr-1 text-muted" />}
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          aria-label={t(l)}
          onClick={() => change(l)}
          className={cn(
            "inline-grid h-11 min-w-11 place-items-center rounded-full px-2 text-sm font-extrabold uppercase",
            l === locale ? "bg-ink text-raised" : "text-current hover:bg-current/10",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
