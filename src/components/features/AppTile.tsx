import { cn } from "@/lib/cn";

const tones = ["bg-success text-on-success", "bg-header text-on-header", "bg-ink text-raised"];

/** The app's initials on a coloured square (charte « Motif »). The colour is stable for a given app. */
export function AppTile({ app, size = "md" }: { app: { id: string; name: string }; size?: "sm" | "md" | "lg" }) {
  const tone = tones[Array.from(app.id).reduce((n, ch) => n + ch.charCodeAt(0), 0) % tones.length];
  const words = app.name.trim().split(/\s+/);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : app.name.slice(0, 2)).toLocaleUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-action font-display font-extrabold",
        tone,
        size === "lg" ? "size-17 text-xl shadow-pop" : size === "sm" ? "size-10 text-xs" : "size-12 text-[15px]",
      )}
    >
      {initials}
    </span>
  );
}
