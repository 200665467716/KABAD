import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";

/**
 * Screen header. On phones it is a 60px bar pinned to the top; from 1024px it becomes
 * the page heading, since the side navigation carries the app's identity.
 */
export function TopBar({
  title,
  subtitle,
  back,
  backLabel = "Retour",
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
  return (
    <header
      className={cn(
        "sticky top-0 z-20 pt-[env(safe-area-inset-top,0px)] lg:static lg:pt-0",
        plain ? "bg-bg" : "border-b border-line bg-raised lg:border-0 lg:bg-transparent",
      )}
    >
      <div className={cn("mx-auto flex min-h-15 max-w-[960px] items-center gap-2 px-4 py-2 lg:min-h-0 lg:px-10 lg:pt-10 lg:pb-2", back && "pl-1 lg:pl-10")}>
        {back && (
          <Link href={back} aria-label={close ? "Fermer" : backLabel} className="inline-grid size-11 shrink-0 place-items-center rounded-full hover:bg-sunken lg:-ml-3">
            <Icon name={close ? "close" : "back"} />
          </Link>
        )}
        {leading}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate font-display text-xl font-bold tracking-[-0.02em] lg:text-3xl lg:whitespace-normal">{title}</h1>}
          {subtitle && <p className="truncate text-[13px] leading-[18px] text-muted lg:text-base lg:leading-6">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children && <div className="mx-auto max-w-[960px] px-4 pb-3 lg:px-10">{children}</div>}
    </header>
  );
}

/** Page content column. */
export function Page({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <main className={cn("mx-auto grid w-full content-start gap-5 px-4 pt-4 pb-6 lg:px-10 lg:pt-6 lg:pb-16", narrow ? "max-w-[640px] lg:max-w-[680px]" : "max-w-[960px]", className)}>{children}</main>;
}

/** Main action of a focused screen: pinned above the phone's home bar, inline on desktop. */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-raised lg:static lg:border-0 lg:bg-transparent">
      <div className={cn("mx-auto grid max-w-[640px] gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom,0px))] lg:max-w-[680px] lg:px-10 lg:pb-16", className)}>{children}</div>
    </div>
  );
}
