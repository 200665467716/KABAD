import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";

/** Public pages for sponsors: no app navigation, no account needed. */
export function SponsorShell({ children }: { children: ReactNode }) {
  const t = useTranslations("hackathons.sponsor");
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b-2 border-line-strong bg-raised pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-10">
          <Link href="/" className="text-ink no-underline">
            <Wordmark />
          </Link>
          <ButtonLink href="/" variant="ghost" size="sm">
            {t("discover")}
          </ButtonLink>
        </div>
      </header>
      {children}
      <footer className="border-t-2 border-line-strong py-7">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-4 text-sm text-muted lg:px-10">
          <span>{t("footer")}</span>
          <span>kabad.app</span>
        </div>
      </footer>
    </div>
  );
}
