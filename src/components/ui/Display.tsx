import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { splitPrize } from "@/lib/prize";
import { Icon, type IconName } from "./Icon";

/* Badge */

export type BadgeTone = "neutral" | "brand" | "accent" | "success" | "danger" | "solidSuccess" | "onBrand";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-muted",
  brand: "bg-brand-soft text-brand-text",
  accent: "bg-accent text-on-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  solidSuccess: "bg-success text-on-success",
  onBrand: "bg-on-brand/15 text-on-brand",
};

export function Badge({ tone = "neutral", icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-xs px-2 text-xs font-bold tracking-[0.06em] uppercase", badgeTones[tone], className)}>
      {icon && <Icon name={icon} size={16} strokeWidth={2.4} className="-ml-0.5 size-3" />}
      {children}
    </span>
  );
}

/* Avatar */

export type AvatarSize = "sm" | "md" | "lg" | "xl";
const avatarSizes: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-22 text-3xl font-display",
};
export type AvatarTone = "brand" | "accent" | "success" | "neutral" | "solidAccent";
const avatarTones: Record<AvatarTone, string> = {
  brand: "bg-brand-soft text-brand-text",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-soft text-success",
  neutral: "bg-sunken text-muted",
  solidAccent: "bg-accent text-on-accent",
};

export function Avatar({ initials, size = "md", tone = "brand", square, className }: { initials: ReactNode; size?: AvatarSize; tone?: AvatarTone; square?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center font-bold select-none", square ? "rounded-lg" : "rounded-full", avatarSizes[size], avatarTones[tone], className)}>
      {initials}
    </span>
  );
}

export function AvatarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex [&>*]:shadow-[0_0_0_2px_var(--bg-raised)] [&>*+*]:-ml-1", className)}>{children}</span>;
}

/* Person row */

export function PersonRow({ avatar, name, badge, meta, extra, action, className }: { avatar: ReactNode; name: ReactNode; badge?: ReactNode; meta?: ReactNode; extra?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {avatar}
      <div className="grid min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-bold">
          <span className="truncate">{name}</span>
          {badge}
        </span>
        {meta && <span className="truncate text-sm text-muted">{meta}</span>}
        {extra}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* Card */

export function Card({ className, interactive, ...rest }: { interactive?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-lg border border-line bg-raised p-4 shadow-sm",
        interactive && "transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-md",
        className,
      )}
      {...rest}
    />
  );
}

export function CardLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "grid gap-3 rounded-lg border border-line bg-raised p-4 text-ink no-underline shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-md",
        className,
      )}
      {...rest}
    />
  );
}

/* Section heading */

export function SectionHead({ id, title, action }: { id?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-display text-lg font-bold tracking-[-0.01em]">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Overline({ children, className, as: Tag = "p", id }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span"; id?: string }) {
  return (
    <Tag id={id} className={cn("text-xs font-bold tracking-[0.08em] text-muted uppercase", className)}>
      {children}
    </Tag>
  );
}

/* Alert */

export type AlertTone = "info" | "success" | "danger" | "reward";
const alertTones: Record<AlertTone, { box: string; icon: string; name: IconName }> = {
  info: { box: "bg-brand-soft", icon: "text-brand-text", name: "info" },
  success: { box: "bg-success-soft", icon: "text-success", name: "check" },
  danger: { box: "bg-danger-soft", icon: "text-danger", name: "info" },
  reward: { box: "bg-accent-soft", icon: "text-accent-text", name: "clock" },
};

export function Alert({ tone = "info", title, children, role, className }: { tone?: AlertTone; title?: ReactNode; children: ReactNode; role?: "status" | "alert"; className?: string }) {
  const t = alertTones[tone];
  return (
    <div role={role} className={cn("grid grid-cols-[20px_1fr] items-start gap-3 rounded-md px-4 py-3 text-sm text-ink", t.box, className)}>
      <Icon name={t.name} size={20} className={cn("mt-0.5", t.icon)} strokeWidth={tone === "success" ? 2 : 1.8} />
      <p>
        {title && <span className="font-bold">{title} </span>}
        {children}
      </p>
    </div>
  );
}

/* Meter */

export function Meter({ value, tone = "brand", label, className, height = "h-2" }: { value: number; tone?: "brand" | "accent" | "success"; label: string; className?: string; height?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const fill = tone === "accent" ? "bg-accent" : tone === "success" ? "bg-success" : "bg-brand";
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn("overflow-hidden rounded-full bg-sunken", height, className)}>
      <span className={cn("block h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* Prize split: 60 / 30 / 10 */

export function PrizeSplit({ total, labels = ["Gagnant", "Son mentor", "KABAD"], className, barHeight = "h-3" }: { total: number; labels?: [string, string, string]; className?: string; barHeight?: string }) {
  const s = splitPrize(total);
  const items = [
    { label: labels[0], value: s.winner, dot: "bg-brand" },
    { label: labels[1], value: s.mentor, dot: "bg-accent" },
    { label: labels[2], value: s.platform, dot: "bg-subtle" },
  ];
  return (
    <div className={cn("grid gap-3", className)}>
      <div className={cn("flex gap-0.5 overflow-hidden rounded-xs", barHeight)} aria-hidden="true">
        <span className="bg-brand" style={{ flex: 60 }} />
        <span className="bg-accent" style={{ flex: 30 }} />
        <span className="bg-subtle" style={{ flex: 10 }} />
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="grid gap-0.5">
            <dt className="flex items-center gap-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
              <span className={cn("size-2 rounded-xs", it.dot)} />
              {it.label}
            </dt>
            <dd className="m-0 font-bold tabular">{formatNumber(it.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* Stat */

export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <b className="font-display text-xl font-bold tracking-[-0.02em] tabular">{value}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/* Day separator, system line */

export function DaySeparator({ children }: { children: ReactNode }) {
  return <span className="justify-self-center rounded-full bg-sunken px-2 py-0.5 text-xs font-bold text-muted">{children}</span>;
}
