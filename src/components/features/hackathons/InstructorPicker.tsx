"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ActionBar, Page } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { formatFCFA, initials } from "@/lib/format";
import type { MentorCard } from "@/lib/domain-types";

type Status = "PROPOSED" | "ACCEPTED" | "DECLINED";

/** H8: the organizer offers the paid mission to badged mentors. */
export function InstructorPicker({ hackathonId, missionText, fee, wanted, mentors, asked }: { hackathonId: string; missionText: string | null; fee: number | null; wanted: number; mentors: MentorCard[]; asked: Record<string, Status> }) {
  const t = useTranslations("hackathons.instructors");
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);
  const accepted = Object.values(asked).filter((s) => s === "ACCEPTED").length;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const { proposed } = await api<{ proposed: number }>(`/api/hackathons/${hackathonId}/missions`, { body: { mentorIds: picked } });
      setSent(proposed);
      setPicked([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Page narrow className="flex-1">
        <div className="grid gap-1">
          <h2 className="font-display text-2xl font-extrabold uppercase">{t("heading")}</h2>
          <p className="text-[15px] text-muted">{t("lead")}</p>
        </div>
        {!fee ? (
          <Alert tone="info">{t("noFee")}</Alert>
        ) : (
          <Card className="gap-2">
            <Overline>{t("mission")}</Overline>
            <p className="text-sm whitespace-pre-line">{missionText ?? t("noMissionText")}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                {t("fee")} <b className="tabular">{formatFCFA(fee)}</b>
              </span>
              <span>
                {t("count")} <b className="tabular">{wanted > 0 ? t("countOf", { accepted, wanted }) : t("countValue", { accepted })}</b>
              </span>
            </div>
          </Card>
        )}
        <section aria-labelledby="suggested" className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <Overline as="h2" id="suggested">
              {t("suggested")}
            </Overline>
            <span className="text-sm font-extrabold text-brand-text">{t("selected", { count: picked.length })}</span>
          </div>
          {mentors.length === 0 && <p className="text-sm text-muted">{t("noMentors")}</p>}
          <ul className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
            {mentors.map((m) => {
              const status = asked[m.id];
              const on = picked.includes(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                  <Avatar initials={initials(m.name)} />
                  <span className="grid min-w-0 flex-1">
                    <b className="truncate">{m.name}</b>
                    <span className="truncate text-[13px] text-muted">{[m.domains.join(", "), m.city].filter(Boolean).join(" · ")}</span>
                  </span>
                  {status ? (
                    <Badge tone={status === "ACCEPTED" ? "success" : status === "DECLINED" ? "neutral" : "brand"}>{t(`status.${status}`)}</Badge>
                  ) : (
                    <Button size="sm" variant={on ? "ink" : "secondary"} aria-pressed={on} disabled={!fee} onClick={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}>
                      {on ? t("chosen") : t("choose")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <div aria-live="polite">
          {sent > 0 && (
            <Alert tone="success" role="status">
              {t("sent", { count: sent })}
            </Alert>
          )}
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Page>
      <ActionBar>
        {picked.length > 0 ? (
          <Button size="lg" block onClick={send} disabled={busy}>
            {busy ? t("sending") : t("send", { count: picked.length })}
          </Button>
        ) : (
          <ButtonLink href={`/hackathons/${hackathonId}`} size="lg" block variant="secondary">
            {t("done")}
          </ButtonLink>
        )}
      </ActionBar>
    </>
  );
}
