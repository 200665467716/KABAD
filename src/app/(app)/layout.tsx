import { BottomNav, SideNav } from "@/components/shell/Navigation";
import { Suspense } from "react";
import { MeProvider } from "@/lib/use-me";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <MeProvider>
      <div className="flex min-h-dvh">
        <Suspense fallback={<div className="hidden w-62 shrink-0 border-r border-line bg-raised lg:block" />}>
          <SideNav />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col">{children}</div>
          <Suspense>
            <BottomNav />
          </Suspense>
        </div>
      </div>
    </MeProvider>
  );
}
