"use client";

import { useTranslations } from "next-intl";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A password input with a button that shows or hides what is typed (screens A2, A7, A9). */
export function PasswordField({ id, label, hint, error, labelAside, className, ...rest }: { id: string; label: ReactNode; hint?: ReactNode; error?: ReactNode; labelAside?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("auth.password");
  const [shown, setShown] = useState(false);
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-extrabold text-ink">
          {label}
        </label>
        {labelAside}
      </div>
      <div className={cn("flex items-center rounded-md border-2 bg-raised pr-0.5 focus-within:outline-2 focus-within:outline-focus", error ? "border-danger" : "border-line-strong")}>
        <input
          id={id}
          type={shown ? "text" : "password"}
          className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-base font-medium text-ink outline-none"
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-msg` : undefined}
          {...rest}
        />
        <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? t("hide") : t("show")} aria-pressed={shown} className="inline-grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-bg">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {shown && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {error ? (
        <span id={`${id}-msg`} className="text-sm font-extrabold text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-msg`} className="text-[13px] leading-[18px] text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
