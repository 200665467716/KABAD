import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Display";
import { formatFCFA } from "@/lib/format";

/**
 * What the pot has collected. Online payment is not wired yet: the payment provider
 * is still to be chosen, so sponsors are told contributions open soon.
 */
export function ContributionForm({ open, collected, contributors, companies }: { open: boolean; collected: number; contributors: number; companies: number }) {
  const t = useTranslations("hackathons.sponsor");
  return (
    <div className="grid gap-4.5 rounded-xl border-2 border-line-strong bg-raised p-5 shadow-pop">
      <div className="grid gap-1">
        <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{t("collected")}</p>
        <p className="font-display text-[34px] leading-10 font-bold tracking-[-0.03em] tabular">{formatFCFA(collected)}</p>
        <p className="text-sm text-muted tabular">
          {companies ? t("contributorsWithCompanies", { count: contributors, companies }) : t("contributorsCount", { count: contributors })}
        </p>
      </div>
      {open ? (
        <Alert tone="info" title={t("soonTitle")}>
          {t("soonText")}
        </Alert>
      ) : (
        <Alert tone="info" title={t("closedTitle")}>
          {t("closedText")}
        </Alert>
      )}
    </div>
  );
}
