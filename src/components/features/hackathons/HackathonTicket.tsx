import { useFormatter, useTranslations } from "next-intl";
import { Ticket } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import type { HackathonSummary } from "@/lib/domain-types";

const DAY = 86_400_000;

/** "Hybride · Cotonou", "En ligne". */
export function useWhere() {
  const t = useTranslations("hackathons.format");
  return (h: Pick<HackathonSummary, "format" | "city">) => (h.city && h.format !== "ONLINE" ? `${t(h.format)} · ${h.city}` : t(h.format));
}

/** "équipes de 2 à 5", "seul", "seul ou en équipe". */
export function useTeamSize() {
  const t = useTranslations("hackathons.team");
  return (h: Pick<HackathonSummary, "teamMin" | "teamMax">) => (h.teamMax === 1 ? t("solo") : h.teamMin === 1 ? t("soloOrTeam") : t("range", { min: h.teamMin, max: h.teamMax }));
}

/** Countdown shown in the ticket stub: days before the start, days left to hand in, then the jury or the end. */
export function useCountdown() {
  const t = useTranslations("hackathons.ticket");
  return (h: HackathonSummary, now: number) => {
  const start = new Date(h.startsAt).getTime();
  const end = new Date(h.endsAt).getTime();
  if (h.status === "DONE") return { before: "", value: <Icon name="trophy" />, after: t("done") };
  if (h.status === "JURY") return { before: t("in"), value: <Icon name="clock" />, after: t("jury") };
  if (now < start) return { before: t("before"), value: Math.max(1, Math.ceil((start - now) / DAY)), after: t("days") };
  return { before: t("dueIn"), value: Math.max(0, Math.ceil((end - now) / DAY)), after: t("days") };
  };
}

export function HackathonTicket({ h, now, href }: { h: HackathonSummary; now: number; href?: string }) {
  const t = useTranslations("hackathons");
  const where = useWhere();
  const size = useTeamSize();
  const c = useCountdown()(h, now);
  const hours = Math.round((new Date(h.endsAt).getTime() - new Date(h.startsAt).getTime()) / 3_600_000);
  return (
    <Ticket href={href ?? `/hackathons/${h.id}`} before={c.before} value={c.value} after={c.after}>
      {!h.published && <span className="justify-self-start rounded-sm bg-brand-wash px-2 py-0.5 text-xs font-extrabold text-brand-text">{t("pending")}</span>}
      <span className="text-xs font-extrabold tracking-[0.08em] text-brand-text uppercase">{where(h)}</span>
      <span className="font-display text-base leading-[21px] font-bold">{h.title}</span>
      <span className="text-[13px] text-muted">
        {t("by")} <b className="text-ink">{h.organizerName}</b>
      </span>
      <span className="text-[13px] text-muted">
        {t("meta", { hours, size: size(h) })}
        {h.instructors > 0 ? ` · ${t("instructorsShort")}` : ""}
      </span>
    </Ticket>
  );
}

export function useDates() {
  const format = useFormatter();
  return (startsAt: string, endsAt: string) => format.dateTimeRange(new Date(startsAt), new Date(endsAt), { day: "numeric", month: "short" });
}
