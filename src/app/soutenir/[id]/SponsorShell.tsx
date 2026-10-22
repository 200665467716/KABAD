import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";

/** Public pages for sponsors: no app navigation, no account needed. */
export function SponsorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-raised pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-10">
          <Link href="/" className="text-ink no-underline">
            <Wordmark />
          </Link>
          <ButtonLink href="/" variant="ghost" size="sm">
            Découvrir KABAD
          </ButtonLink>
        </div>
      </header>
      {children}
      <footer className="border-t border-line py-7">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-4 text-sm text-muted lg:px-10">
          <span>KABAD · par les devs, pour les devs</span>
          <span>kabad.app</span>
        </div>
      </footer>
    </div>
  );
}
