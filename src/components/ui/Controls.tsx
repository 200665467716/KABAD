"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/** Segmented tabs. `items` are [value, label, count?]. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  stretch,
  className,
}: {
  items: Array<{ value: T; label: ReactNode; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  stretch?: boolean;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("gap-0.5 rounded-md bg-sunken p-[3px]", stretch ? "grid" : "inline-flex", className)} style={stretch ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined}>
      {items.map((it) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-bold whitespace-nowrap transition-colors",
              selected ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && it.count > 0 && <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs text-on-brand tabular">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleChip({ pressed, onClick, children, icon }: { pressed: boolean; onClick: () => void; children: ReactNode; icon?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-bold whitespace-nowrap transition-colors",
        pressed ? "border-ink bg-ink text-raised" : "border-line-strong bg-raised text-ink hover:bg-sunken",
      )}
    >
      {icon && <Icon name="plus" size={16} />}
      {children}
    </button>
  );
}

/**
 * Bottom sheet on phones, centred dialog from 640px. Built on the native <dialog>,
 * so focus is trapped and Escape closes it.
 */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-[var(--scrim)] sm:m-auto sm:max-w-[480px]"
    >
      <div className="grid max-h-[88dvh] gap-4 overflow-y-auto rounded-t-xl bg-raised px-4 pt-2 pb-6 shadow-lg safe-bottom sm:rounded-xl sm:px-6 sm:pt-6">
        <span className="h-1 w-10 justify-self-center rounded-full bg-line-strong/50 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="inline-grid size-11 place-items-center rounded-full hover:bg-sunken">
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </dialog>
  );
}
