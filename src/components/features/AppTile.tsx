import { cn } from "@/lib/cn";

const tones = ["bg-success-soft text-success", "bg-accent-soft text-accent-text", "bg-brand-soft text-brand-text"];

/** The app's initial on a tinted tile. The tint is stable for a given app. */
export function AppTile({ app, size = "md" }: { app: { id: string; name: string }; size?: "md" | "lg" }) {
  const tone = tones[Array.from(app.id).reduce((n, ch) => n + ch.charCodeAt(0), 0) % tones.length];
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center font-display font-bold", tone, size === "lg" ? "size-16 rounded-2xl text-[26px]" : "size-12 rounded-lg text-lg")}>
      {Array.from(app.name)[0]?.toLocaleUpperCase("fr")}
    </span>
  );
}
