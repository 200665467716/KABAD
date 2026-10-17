import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { LogoMark } from "../ui/Logo";

/** Sign-up and sign-in screens: one narrow column, step indicator, actions pinned at the bottom on phones. */
export function AuthFrame({
  back,
  step,
  skip,
  title,
  lead,
  children,
  footer,
}: {
  back: string;
  step?: number;
  skip?: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:items-center lg:justify-center lg:py-12">
      <div className="flex w-full flex-1 flex-col lg:max-w-[480px] lg:flex-none lg:rounded-xl lg:border lg:border-line lg:bg-raised lg:shadow-md">
        <header className="flex min-h-15 items-center gap-2 px-1 pt-[env(safe-area-inset-top,0px)] lg:px-4 lg:pt-2">
          <Link href={back} aria-label="Retour" className="inline-grid size-11 place-items-center rounded-full hover:bg-sunken">
            <Icon name="back" />
          </Link>
          <span className="flex-1 text-sm font-bold text-muted">{step ? `Étape ${step} sur 3` : ""}</span>
          {skip && (
            <Link href={skip} className="px-3 py-3 text-sm font-bold text-brand-text no-underline">
              Passer
            </Link>
          )}
        </header>
        <main className="grid flex-1 content-start gap-6 px-6 pt-2 pb-4 lg:px-8">
          {step ? (
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= step ? "h-1 flex-1 rounded-full bg-brand" : "h-1 flex-1 rounded-full bg-sunken"} />
              ))}
            </div>
          ) : (
            <LogoMark size={56} />
          )}
          <div className="grid gap-2">
            <h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-[32px] lg:leading-9">{title}</h1>
            {lead && <p className="text-muted">{lead}</p>}
          </div>
          {children}
        </main>
        <div className="sticky bottom-0 grid gap-3 bg-bg px-6 pt-3 pb-[max(28px,env(safe-area-inset-bottom,0px))] lg:static lg:rounded-b-xl lg:bg-raised lg:px-8 lg:pb-8">{footer}</div>
      </div>
    </div>
  );
}
