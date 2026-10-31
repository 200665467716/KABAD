"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { bookingSchema } from "@/lib/schemas";

/** Topic, precise problem and an optional link: what the mentor reads before accepting (screen M3). */
export function BookingForm({ mentorId, mentorName, startsAt }: { mentorId: string; mentorName: string; startsAt: string }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = bookingSchema.safeParse({ mentorId, startsAt, topic: data.get("topic"), problem: data.get("problem"), link: data.get("link") ?? "" });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const { id } = await api<{ id: string }>("/api/mentoring/bookings", { body: parsed.data });
      router.push(`/mentorat/seances/${id}`);
    } catch (err) {
      setErrors({ [err instanceof ApiError && err.field && err.field !== "startsAt" ? err.field : "form"]: err instanceof ApiError ? err.message : t("error") });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Page narrow className="pt-0">
        <TextField id="topic" name="topic" label={t("book.topic")} maxLength={120} error={errors.topic} />
        <TextArea id="problem" name="problem" label={t("book.problem")} rows={5} maxLength={1000} hint={t("book.problemHint", { name: mentorName })} error={errors.problem} />
        <TextField
          id="link"
          name="link"
          type="url"
          inputMode="url"
          placeholder={t("book.linkPlaceholder")}
          label={
            <>
              {t("book.link")} <span className="font-semibold text-muted">{t("book.optional")}</span>
            </>
          }
          error={errors.link}
        />
        {errors.form && (
          <Alert tone="danger" role="alert">
            {errors.form}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {t("book.submit")}
        </Button>
        <p className="text-center text-[13px] text-muted">{t("book.free", { name: mentorName })}</p>
      </ActionBar>
    </form>
  );
}
