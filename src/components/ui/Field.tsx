import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const control =
  "w-full rounded-md border-2 border-line-strong bg-raised px-3.5 text-base font-medium text-ink placeholder:text-muted focus:outline-3 focus:outline-offset-2 focus:outline-focus aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]";

type Meta = { label: ReactNode; hint?: ReactNode; error?: ReactNode; counter?: ReactNode; className?: string };

function Wrapper({ id, label, hint, error, counter, className, children }: Meta & { id: string; children: ReactNode }) {
  return (
    // One column that may shrink: a date field with a value is wider than half a phone screen, and must not widen the page.
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2", className)}>
      <label htmlFor={id} className="text-sm font-extrabold text-ink">
        {label}
      </label>
      {children}
      {(hint || error || counter) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <span id={`${id}-msg`} className="flex items-start gap-1.5 text-[13px] leading-[18px] font-bold text-danger">
              <Icon name="info" size={16} className="mt-px" />
              {error}
            </span>
          ) : hint ? (
            <span id={`${id}-msg`} className="text-[13px] leading-[18px] text-muted">
              {hint}
            </span>
          ) : (
            <span />
          )}
          {counter && <span className="shrink-0 text-xs text-subtle tabular">{counter}</span>}
        </div>
      )}
    </div>
  );
}

export function TextField({ id, label, hint, error, counter, className, inputClassName, ...rest }: Meta & { id: string; inputClassName?: string } & ComponentProps<"input">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} counter={counter} className={className}>
      <input
        id={id}
        className={cn(control, "h-12", inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextArea({ id, label, hint, error, counter, className, rows = 4, ...rest }: Meta & { id: string } & ComponentProps<"textarea">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} counter={counter} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={cn(control, "resize-y py-2.5 leading-6")}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        {...rest}
      />
    </Wrapper>
  );
}

export function Select({ id, label, hint, error, className, children, ...rest }: Meta & { id: string } & ComponentProps<"select">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        className={cn(control, "h-12 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9")} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d1020' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}

export function Checkbox({ children, className, ...rest }: { children: ReactNode; className?: string } & ComponentProps<"input">) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input type="checkbox" className="size-5.5 shrink-0 accent-[var(--brand)]" {...rest} />
      <span>{children}</span>
    </label>
  );
}

/** A selectable card holding a radio button. */
export function RadioCard({ checked, heading, description, className, ...rest }: { heading: ReactNode; description?: ReactNode; className?: string } & Omit<ComponentProps<"input">, "title">) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-action border-2 px-3.5 py-3 transition-colors",
        checked ? "border-brand bg-brand-soft shadow-[inset_0_0_0_1px_var(--brand)]" : "border-line-strong bg-raised",
        className,
      )}
    >
      <input type="radio" checked={checked} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" {...rest} />
      <span className="grid gap-0.5">
        <span className="text-[15px] leading-5 font-extrabold">{heading}</span>
        {description && <span className="text-[13px] leading-[18px] text-muted">{description}</span>}
      </span>
    </label>
  );
}
