import { BottomNav, SideNav } from "@/components/shell/Navigation";
import { Suspense, ViewTransition } from "react";
import { PAGE_TRANSITION } from "@/i18n/navigation";
import { MeProvider } from "@/lib/use-me";
import { VerifyBanner } from "@/components/shell/VerifyBanner";

export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <MeProvider>
      <div className="flex min-h-dvh">
        <Suspense fallback={<div className="hidden w-62 shrink-0 border-r border-line bg-raised lg:block" />}>
          <SideNav />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <VerifyBanner />
          {/* Changement de page par un lien : fondu montant (classe kb-page, globals.css). Rien sur un simple rafraîchissement. */}
          <ViewTransition update={{ [PAGE_TRANSITION]: "kb-page", default: "none" }} default="none">
            <div className="flex flex-1 flex-col">{children}</div>
          </ViewTransition>
          <Suspense>
            <BottomNav />
          </Suspense>
        </div>
      </div>
    </MeProvider>
  );
}
