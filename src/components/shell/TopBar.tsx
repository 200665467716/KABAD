import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Band } from "../ui/Band";
import { Icon } from "../ui/Icon";

/**
 * Screen header, charte « Motif » : bloc indigo, titre Unbounded en capitales, bandeau en bas.
 * On phones it is pinned to the top; from 1024px it heads the content column, next to the side navigation.
 * `plain` keeps a quiet sand header for detail screens whose content carries its own colour.
 */
export function TopBar({
  title,
  subtitle,
  back,
  backLabel,
  close,
  leading,
  actions,
  children,
  plain,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  backLabel?: string;
  close?: boolean;
  leading?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  plain?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <header className={cn("sticky top-0 z-20 pt-[env(safe-area-inset-top,0px)] lg:static", plain ? "bg-bg text-ink" : "bg-header text-on-header")}>
      <div className={cn("mx-auto flex min-h-15 max-w-[960px] items-center gap-1 py-1 pr-2 pl-4 lg:min-h-20 lg:px-10", Boolean(back || leading) && "pl-1 lg:pl-8")}>
        {back && (
          <Link href={back} aria-label={close ? t("close") : (backLabel ?? t("back"))} className="inline-grid size-11 shrink-0 place-items-center rounded-full hover:bg-current/12">
            <Icon name={close ? "close" : "back"} />
          </Link>
        )}
        {leading}
        <div className={cn("min-w-0 flex-1", Boolean(back || leading) && "pl-2")}>
          {title && <h1 className="truncate font-display text-lg font-extrabold uppercase lg:text-2xl lg:whitespace-normal">{title}</h1>}
          {subtitle && <p className={cn("truncate text-[13px] leading-[18px] lg:text-sm", plain ? "text-muted" : "text-on-header-muted")}>{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children && <div className="mx-auto max-w-[960px] px-4 pb-3 lg:px-10">{children}</div>}
      {!plain && <Band />}
    </header>
  );
}

/**
 * Page content column.
 * A narrow page often stretches (flex-1) so that its action bar sits at the bottom of a phone screen. From
 * 1024px the action bar follows the content (ActionBar is static there): the page stops stretching and keeps
 * a small bottom margin, otherwise an empty band opened between the content and the buttons.
 */
export function Page({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return (
    <main className={cn("mx-auto grid w-full content-start gap-5.5 px-4 pt-4 pb-6 lg:px-10 lg:pt-8", narrow ? "max-w-[640px] lg:max-w-[680px] lg:pb-8" : "max-w-[960px] lg:pb-16", className, narrow && "lg:flex-none")}>
      {children}
    </main>
  );
}

/** Main action of a focused screen: pinned above the phone's home bar, inline on desktop. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="sticky bottom-0 z-10 border-t-2 border-line-strong bg-raised lg:static lg:border-0 lg:bg-transparent">
      <div className={cn("mx-auto grid max-w-[640px] gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom,0px))] lg:max-w-[680px] lg:px-10 lg:pb-16", className)}>{children}</div>
    </div>
  );
}
