import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Band } from "../ui/Band";
import { Icon } from "../ui/Icon";
import { LogoMark } from "../ui/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Sign-up and sign-in screens, charte « Motif » : en-tête indigo avec les étapes et le bandeau,
 * une colonne étroite, actions fixées en bas sur téléphone.
 */
export function AuthFrame({
  back,
  step,
  steps = 5,
  skip,
  heading,
  title,
  lead,
  children,
  footer,
}: {
  back: string;
  step?: number;
  /** Sign-up has 5 steps in the design; the mentor badge request has 2. */
  steps?: number;
  skip?: string;
  /** The word in the indigo header: "Inscription", "Ton profil", "Connexion"… */
  heading?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:items-center lg:justify-center lg:py-12">
      <div className="flex w-full flex-1 flex-col lg:max-w-[480px] lg:flex-none lg:overflow-hidden lg:rounded-xl lg:border-2 lg:border-line-strong lg:bg-raised">
        <header className="bg-header pt-[env(safe-area-inset-top,0px)] text-on-header">
          <div className="flex min-h-15 items-center gap-1 px-1 py-1 lg:px-3">
            <Link href={back} aria-label={t("back")} className="inline-grid size-11 place-items-center rounded-full hover:bg-current/12">
              <Icon name="back" />
            </Link>
            <span className="min-w-0 flex-1 truncate pl-1 font-display text-lg font-extrabold uppercase">{heading}</span>
            {step ? <span className="pr-2 text-[13px] font-extrabold text-on-header-muted">{t("stepShort", { step, total: steps })}</span> : null}
            {skip ? (
              <Link href={skip} className="px-3 py-3 text-sm font-extrabold text-on-header no-underline">
                {t("skip")}
              </Link>
            ) : (
              <LanguageSwitcher compact />
            )}
          </div>
          {step ? (
            <div className="flex gap-1 px-4 pb-3" aria-hidden="true">
              {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
                <span key={n} className={n <= step ? "h-1.5 flex-1 rounded-full bg-on-header" : "h-1.5 flex-1 rounded-full bg-on-header/25"} />
              ))}
            </div>
          ) : null}
          <Band />
        </header>
        <main className="grid flex-1 content-start gap-6 px-4 pt-6 pb-4 lg:px-8">
          {!step && <LogoMark size={56} />}
          <div className="grid gap-2">
            <h1 className="font-display text-2xl font-extrabold uppercase">{title}</h1>
            {lead && <p className="text-[15px] leading-[22px] text-[var(--slate-deep)] dark:text-muted">{lead}</p>}
          </div>
          {children}
        </main>
        <div className="sticky bottom-0 grid gap-2 border-t-2 border-line-strong bg-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom,0px))] lg:static lg:px-8 lg:pb-8">{footer}</div>
      </div>
    </div>
  );
}
