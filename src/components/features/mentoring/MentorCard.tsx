import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, TagList } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import type { MentorCard as Mentor } from "@/lib/domain-types";

/** A mentor of the catalogue (screen M1): avatar, area and city, technologies, next free slot. */
export function MentorCard({ mentor, timeZone }: { mentor: Mentor; timeZone: string }) {
  const t = useTranslations("mentoring.list");
  const format = useFormatter();
  const next = mentor.nextSlot ? format.dateTime(new Date(mentor.nextSlot), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone }) : null;
  return (
    <Link href={`/mentorat/mentors/${mentor.id}`} className="grid gap-3 rounded-lg border-2 border-line-strong bg-raised p-4 text-ink no-underline transition-[box-shadow,translate] duration-200 ease-kb hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:shadow-none">
      <div className="flex items-center gap-3">
        <Avatar initials={initials(mentor.name)} size="lg" tone="brand" />
        <div className="grid min-w-0">
          <span className="truncate font-display text-base font-bold">{mentor.name}</span>
          <span className="truncate text-[13px] text-muted">{[mentor.domains[0] ?? mentor.headline, mentor.city].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <TagList items={mentor.technologies.slice(0, 4)} />
      <span className={next ? "text-sm font-extrabold text-success" : "text-sm text-muted"}>{next ? t("nextSlot", { when: next }) : t("noSlot")}</span>
    </Link>
  );
}
