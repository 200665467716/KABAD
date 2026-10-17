import { BottomNav, SideNav } from "@/components/shell/Navigation";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
