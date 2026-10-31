import { Link } from "@/i18n/navigation";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "ink" | "secondary" | "ghost" | "accent" | "danger" | "success" | "onBrand";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 font-extrabold transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(.2,0,0,1)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 select-none";

/*
 * Charte « Motif » : principal en indigo (un seul par écran), secondaire en encre,
 * contour encre de 2 px pour les actions de second plan.
 */
const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-brand text-on-brand hover:bg-brand-hover",
  ink: "border-transparent bg-ink text-raised hover:opacity-90",
  secondary: "bg-raised text-ink border-line-strong hover:bg-bg",
  ghost: "border-transparent bg-transparent text-brand-text hover:bg-brand-soft",
  accent: "border-line-strong bg-accent text-on-accent hover:shadow-pop",
  danger: "border-transparent bg-danger text-on-danger hover:opacity-90",
  success: "border-transparent bg-success text-on-success hover:opacity-90",
  onBrand: "bg-transparent text-on-brand border-on-brand/60 hover:bg-on-brand/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 rounded-md px-4 text-sm",
  md: "h-12 rounded-md px-5 text-[15px]",
  lg: "h-13 rounded-action px-6 text-base",
};

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
  className?: string;
  children?: ReactNode;
};

export function buttonClass({ variant = "primary", size = "md", block, iconOnly, className }: Omit<Common, "children" | "icon">) {
  return cn(base, variants[variant], sizes[size], block && "w-full", iconOnly && (size === "sm" ? "w-10 px-0" : size === "lg" ? "w-13 px-0" : "w-12 px-0"), className);
}

function Content({ icon, children, size }: { icon?: IconName; children?: ReactNode; size: ButtonSize }) {
  return (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children !== undefined && <span className="text-trim">{children}</span>}
    </>
  );
}

export function Button({ variant, size = "md", block, icon, iconOnly, className, children, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, iconOnly, className })} {...rest}>
      <Content icon={icon} size={size}>{children}</Content>
    </button>
  );
}

export function ButtonLink({ variant, size = "md", block, icon, iconOnly, className, children, href, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={buttonClass({ variant, size, block, iconOnly, className })} {...rest}>
      <Content icon={icon} size={size}>{children}</Content>
    </Link>
  );
}

/** A round 44px icon-only control used in top bars. Takes the colour of its surroundings (white on the indigo header). */
export function IconButton({ icon, label, dot, className, href, ...rest }: { icon: IconName; label: string; dot?: boolean; href?: string } & ComponentProps<"button">) {
  const cls = cn("relative inline-grid size-11 shrink-0 place-items-center rounded-full text-current hover:bg-current/12", className);
  const inner = (
    <>
      <Icon name={icon} strokeWidth={icon === "more" ? 3 : 2} />
      {dot && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent shadow-[0_0_0_2px_var(--header)]" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls} {...rest}>
      {inner}
    </button>
  );
}
