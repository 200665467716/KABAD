import { cn } from "@/lib/cn";

/**
 * The Africa Rise-Up symbol: a sprout growing between two code chevrons.
 * The leaves take `leaf` (white on maize, maize on indigo); the strokes follow the text colour.
 */
export function RiseSymbol({ size = 40, leaf = "#ffffff", className, label }: { size?: number; leaf?: string; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M18 40 8 48l10 8" />
      <path d="M46 40l10 8-10 8" />
      <path d="M32 58V22" />
      <path d="M32 36c-9 0-14-6-14-14 9 0 14 6 14 14z" fill={leaf} />
      <path d="M32 28c0-9 6-16 16-16 0 9-6 16-16 16z" fill={leaf} />
    </svg>
  );
}
