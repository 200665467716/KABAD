"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Overline } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RATING_COMMENT_MAX } from "@/lib/schemas";

const MARKS = [1, 2, 3, 4, 5] as const;

/** Five stars; `value` of them are filled. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-hidden="true">
      {MARKS.map((n) => (
        <Star key={n} on={n <= value} size={18} />
      ))}
    </span>
  );
}

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

/** After the session, the dev gives it a mark from 1 to 5 and, if they wish, a word for the mentor. Sent once. */
export function RateSession({ id, mentor }: { id: string; mentor: string }) {
  const t = useTranslations("mentoring.rating");
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/bookings/${id}/rating`, { body: { rating, comment: comment.trim() || undefined } });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3">
      <Overline as="h3">{t("title")}</Overline>
      <p className="text-sm">{t("lead", { name: mentor })}</p>
      <div role="radiogroup" aria-label={t("label")} className="flex gap-1">
        {MARKS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t("mark", { n })} onClick={() => setRating(n)} className={cn("inline-grid size-11 place-items-center rounded-full hover:bg-bg", n <= rating ? "text-brand-text" : "text-subtle")}>
            <Star on={n <= rating} size={28} />
          </button>
        ))}
      </div>
      <TextArea id="rating-comment" label={t("comment")} hint={t("commentHint", { name: mentor })} rows={3} value={comment} maxLength={RATING_COMMENT_MAX} onChange={(e) => setComment(e.target.value)} counter={`${comment.length} / ${RATING_COMMENT_MAX}`} />
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <Button variant="ink" disabled={busy || rating === 0} onClick={send} className="justify-self-start">
        {busy ? t("sending") : t("send")}
      </Button>
    </Card>
  );
}
