import { cn } from "@/lib/cn";

type Props = { size?: number; inverse?: boolean; className?: string; decorative?: boolean };

/** The K made of code bars. The yellow middle bar is the line where knowledge passes from one dev to another. */
export function LogoMark({ size = 32, inverse = false, className, decorative = false }: Props) {
  const ground = inverse ? "#ffffff" : "var(--brand)";
  const bars = inverse ? "#283588" : "var(--on-brand)";
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "KABAD"}
      aria-hidden={decorative || undefined}
    >
      <rect width="64" height="64" rx={inverse ? 10 : 12} fill={ground} />
      <g fill={bars}>
        <rect x="16" y="13" width="8" height="6" rx="1.5" />
        <rect x="38" y="13" width="10" height="6" rx="1.5" />
        <rect x="16" y="21" width="8" height="6" rx="1.5" />
        <rect x="32" y="21" width="10" height="6" rx="1.5" />
        <rect x="16" y="37" width="8" height="6" rx="1.5" />
        <rect x="32" y="37" width="10" height="6" rx="1.5" />
        <rect x="16" y="45" width="8" height="6" rx="1.5" />
        <rect x="38" y="45" width="10" height="6" rx="1.5" />
      </g>
      <rect x="16" y="29" width="20" height="6" rx="1.5" fill="#f2b705" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={32} decorative />
      <span className="font-display text-lg font-extrabold tracking-[0.04em]">KABAD</span>
    </span>
  );
}
