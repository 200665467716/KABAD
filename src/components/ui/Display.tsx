import { Link } from "@/i18n/navigation";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { splitPrize } from "@/lib/prize";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "./Icon";

/* Badge : toujours un mot avec la couleur d'état (« Confirmée », « En direct »). */

export type BadgeTone = "neutral" | "brand" | "accent" | "success" | "danger" | "solidSuccess" | "onBrand" | "live";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-muted",
  brand: "bg-brand-wash text-brand-text",
  accent: "bg-accent text-on-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  solidSuccess: "bg-success text-on-success",
  onBrand: "bg-on-brand/15 text-on-brand",
  live: "bg-ink text-raised",
};

export function Badge({ tone = "neutral", icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6.5 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-extrabold", badgeTones[tone], className)}>
      {tone === "live" && <span aria-hidden="true" className="size-[7px] rounded-full bg-live" />}
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
  xl: "size-22 text-2xl font-display",
};
export type AvatarTone = "brand" | "accent" | "success" | "neutral" | "solidAccent";
const avatarTones: Record<AvatarTone, string> = {
  brand: "bg-brand text-on-brand",
  accent: "bg-accent text-on-accent",
  success: "bg-success-soft text-success",
  neutral: "bg-bg text-ink shadow-[inset_0_0_0_2px_var(--border-strong)]",
  solidAccent: "bg-accent text-on-accent",
};

export function Avatar({ initials, size = "md", tone = "brand", square, className }: { initials: ReactNode; size?: AvatarSize; tone?: AvatarTone; square?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center font-extrabold select-none", square ? "rounded-lg" : "rounded-full", avatarSizes[size], avatarTones[tone], className)}>
      {initials}
    </span>
  );
}

export function AvatarGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex [&>*]:shadow-[0_0_0_2px_var(--bg-raised)] [&>*+*]:-ml-2", className)}>{children}</span>;
}

/* Person row */

export function PersonRow({ avatar, name, badge, meta, extra, action, className }: { avatar: ReactNode; name: ReactNode; badge?: ReactNode; meta?: ReactNode; extra?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {avatar}
      <div className="grid min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-extrabold">
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

/* Card : bordure encre de 2 px, rayon 18. `featured` ajoute l'ombre décalée : une seule carte vedette par écran. */

export function Card({ className, interactive, featured, ...rest }: { interactive?: boolean; featured?: boolean } & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-lg border-2 border-line-strong bg-raised p-4",
        featured && "rounded-xl shadow-pop",
        interactive && "transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-pop",
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
        "grid gap-3 rounded-lg border-2 border-line-strong bg-raised p-4 text-ink no-underline transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-pop",
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
      <h2 id={id} className="font-display text-md font-extrabold uppercase">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Overline({ children, className, as: Tag = "p", id }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span"; id?: string }) {
  return (
    <Tag id={id} className={cn("text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase", className)}>
      {children}
    </Tag>
  );
}

/* Alert */

export type AlertTone = "info" | "success" | "danger" | "reward";
const alertTones: Record<AlertTone, { box: string; icon: string; name: IconName }> = {
  info: { box: "bg-brand-wash", icon: "text-brand-text", name: "info" },
  success: { box: "bg-success-soft", icon: "text-success", name: "check" },
  danger: { box: "bg-danger-soft", icon: "text-danger", name: "info" },
  reward: { box: "bg-accent-soft", icon: "text-accent-text", name: "clock" },
};

export function Alert({ tone = "info", title, children, role, className }: { tone?: AlertTone; title?: ReactNode; children: ReactNode; role?: "status" | "alert"; className?: string }) {
  const t = alertTones[tone];
  return (
    <div role={role} className={cn("grid grid-cols-[20px_1fr] items-start gap-3 rounded-action px-4 py-3 text-sm text-ink", t.box, className)}>
      <Icon name={t.name} size={20} className={cn("mt-0.5", t.icon)} strokeWidth={2} />
      <p>
        {title && <span className="font-extrabold">{title} </span>}
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
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn("overflow-hidden rounded-full bg-brand-wash", height, className)}>
      <span className={cn("block h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* Prize split: 60 / 30 / 10 */

export function PrizeSplit({ total, labels, className, barHeight = "h-3" }: { total: number; labels?: [string, string, string]; className?: string; barHeight?: string }) {
  const t = useTranslations("prize");
  labels ??= [t("winner"), t("mentor"), t("platform")];
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
      <b className="font-display text-[28px] leading-[30px] font-extrabold tabular">{value}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/* Day separator, system line */

export function DaySeparator({ children }: { children: ReactNode }) {
  return <span className="justify-self-center rounded-full bg-brand-wash px-2.5 py-1 text-xs font-extrabold text-muted">{children}</span>;
}

/* Charte « Motif » : composants de la page Composants. */

/** A neutral tag: a technology, a skill. */
export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand"; className?: string }) {
  return <span className={cn("inline-flex h-6.5 items-center rounded-sm px-2.5 text-xs font-extrabold", tone === "brand" ? "bg-[var(--mist)] text-brand-text" : "bg-bg text-ink", className)}>{children}</span>;
}

export function TagList({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
    </div>
  );
}

/** Time and length of a mentoring session, always indigo: "15h · 30 min". */
export function TimeBlock({ time, length, className }: { time: ReactNode; length: ReactNode; className?: string }) {
  return (
    <span className={cn("grid size-18 shrink-0 content-center justify-items-center rounded-action bg-header text-on-header", className)}>
      {/* "15 h" fits at 20px; "15:30" or "3:30 PM" drop to a smaller size instead of overflowing. */}
      <b className={cn("font-display leading-6 font-extrabold whitespace-nowrap", typeof time === "string" && time.length > 4 ? (time.length > 5 ? "text-[13px]" : "text-base") : "text-xl")}>{time}</b>
      <span className="text-xs font-extrabold text-on-header-muted">{length}</span>
    </span>
  );
}

/** A hackathon ticket: details on the left, a black stub with the countdown on the right. */
export function Ticket({ children, before, value, after, className, href }: { children: ReactNode; before: ReactNode; value: ReactNode; after: ReactNode; className?: string; href?: string }) {
  const body = (
    <>
      <div className="grid min-w-0 content-start gap-1.5 px-4 py-3.5">{children}</div>
      <div className="grid content-center justify-items-center gap-0.5 border-l-2 border-dashed border-bg bg-ink text-accent">
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{before}</span>
        <span className="font-display text-[28px] leading-[30px] font-extrabold tabular">{value}</span>
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{after}</span>
      </div>
    </>
  );
  const cls = cn("grid grid-cols-[minmax(0,1fr)_84px] overflow-hidden rounded-lg border-2 border-line-strong bg-raised text-ink no-underline", href && "transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-pop", className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** "Mentors vérifiés" / "Tout voir": section title in capitals, link on the right. */
export function SectionLink({ id, title, href, label }: { id?: string; title: ReactNode; href?: string; label?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-display text-md font-extrabold uppercase">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-extrabold text-brand-text no-underline">
          {label}
        </Link>
      )}
    </div>
  );
}
