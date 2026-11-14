import { useFormatter, useTranslations } from "next-intl";
import { Badge, TimeBlock } from "@/components/ui/Display";
import type { BookingStatus } from "@/lib/domain-types";

const tones: Record<BookingStatus, "brand" | "success" | "neutral" | "danger"> = { PENDING: "brand", ACCEPTED: "success", DECLINED: "danger", CANCELLED: "neutral" };

/** Time block, topic and date of a session (screens M3, M4, M6). */
export function BookingSummary({ startsAt, minutes, topic, otherName, timeZone, status }: { startsAt: string; minutes: number; topic?: string; otherName: string; timeZone: string; status?: BookingStatus }) {
  const t = useTranslations("mentoring");
  const format = useFormatter();
  const at = new Date(startsAt);
  const end = new Date(at.getTime() + minutes * 60_000);
  // "18:30" in French, "6:30 PM" in English: the minutes are kept (a session can start at half past).
  const clock = (d: Date) => format.dateTime(d, { hour: "numeric", minute: "2-digit", timeZone });
  const date = `${format.dateTime(at, { weekday: "short", day: "numeric", month: "short", timeZone })} · ${clock(at)} – ${clock(end)}`;
  return (
    <div className="flex items-center gap-3.5">
      <TimeBlock time={clock(at)} length={t("minutes", { count: minutes })} />
      <div className="grid min-w-0 flex-1 gap-1">
        {topic ? (
          <>
            <span className="text-[17px] leading-[22px] font-extrabold">{topic}</span>
            <span className="text-[13px] text-muted">{t("session.dateWith", { date, name: otherName })}</span>
          </>
        ) : (
          <>
            <span className="text-[17px] leading-[22px] font-extrabold">{date}</span>
            <span className="text-[13px] text-muted">
              {t("book.with")} <b className="text-ink">{otherName}</b>
            </span>
          </>
        )}
        {status && (
          <Badge tone={tones[status]} className="justify-self-start">
            {t(`status.${status}`)}
          </Badge>
        )}
      </div>
    </div>
  );
}
