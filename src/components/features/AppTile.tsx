import { cn } from "@/lib/cn";
import type { TestApp } from "@/lib/data";

const tones: Record<TestApp["tone"], string> = {
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent-text",
  brand: "bg-brand-soft text-brand-text",
};

export function AppTile({ app, size = "md" }: { app: TestApp; size?: "md" | "lg" }) {
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center font-display font-bold", tones[app.tone], size === "lg" ? "size-16 rounded-2xl text-[26px]" : "size-12 rounded-lg text-lg")}>
      {app.letter}
    </span>
  );
}
