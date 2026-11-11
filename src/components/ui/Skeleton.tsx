import { cn } from "@/lib/cn";

/** A grey block standing for content still loading (P3). Its sheen stops with « réduire les animations ». */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("kb-skel block rounded-sm", className)} />;
}

/**
 * Loading state of a screen (P3): the shape of a list of cards instead of a « Chargement… » line.
 * Screen readers hear the label once, in a status region.
 */
export function ScreenSkeleton({ label, cards = 3 }: { label: string; cards?: number }) {
  return (
    <div aria-busy="true" className="mx-auto grid w-full max-w-[640px] gap-4 px-4 py-5">
      <p role="status" className="sr-only">
        {label}
      </p>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-3/5" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} aria-hidden="true" className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-lg border-2 border-line bg-raised p-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="grid content-center gap-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state (P4): dashed card, a square picture, a title, a sentence and one action. */
export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2.5 rounded-lg border-2 border-dashed border-line-strong bg-raised px-5 py-7 text-center">
      <span className="grid size-16 place-items-center rounded-lg bg-[var(--mist)] text-brand-text" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-1 font-display text-md font-extrabold uppercase">{title}</h3>
      {text && <p className="max-w-[30ch] text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
