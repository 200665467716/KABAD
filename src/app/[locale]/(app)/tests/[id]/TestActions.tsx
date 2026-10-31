"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, AvatarGroup, Meter, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { TestAppDetail } from "@/lib/domain-types";
import { initials } from "@/lib/format";

/** Steps to tick, testers, and the main action: join the group, open it, send the report or read the reports. */
export function TestActions({ app, owner }: { app: TestAppDetail; owner: boolean }) {
  const t = useTranslations("tests.detail");
  const router = useRouter();
  const [done, setDone] = useState<number[]>(app.myDoneSteps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (index: number) =>
    run(async () => {
      const next = !done.includes(index);
      const r = await api<{ doneSteps: number[] }>(`/api/tests/${app.id}/steps`, { method: "PUT", body: { index, done: next } });
      setDone(r.doneSteps);
    });

  const join = () =>
    run(async () => {
      const r = await api<{ conversationId: string | null }>(`/api/tests/${app.id}/testers`, { method: "POST" });
      if (r.conversationId) router.push(`/messages/${r.conversationId}`);
      else router.refresh();
    });

  const leave = () =>
    run(async () => {
      await api(`/api/tests/${app.id}/testers`, { method: "DELETE" });
      router.refresh();
    });

  const canReport = app.joined && (app.myReport === null || app.myReport === "REFUSED");
  const others = Math.max(0, app.testers - app.testerAvatars.length);

  return (
    <>
      <section className="grid gap-2.5" aria-labelledby="to-test">
        <Overline as="h3" id="to-test">
          {t("toTest")}
        </Overline>
        {app.joined && <p className="text-[13px] text-muted">{t("checkHelp")}</p>}
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {app.steps.map((s, i) => {
            const isDone = done.includes(i);
            const badge = <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-sm font-extrabold", isDone ? "bg-success text-on-success" : "bg-ink text-raised")}>{isDone ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}</span>;
            return (
              <li key={i}>
                {app.joined ? (
                  <button type="button" disabled={busy} onClick={() => toggle(i)} aria-pressed={isDone} aria-label={`${isDone ? t("stepDone", { n: i + 1 }) : t("stepTodo", { n: i + 1 })} : ${s}`} className="flex min-h-11 w-full items-center gap-3 rounded-action border-2 border-line-strong bg-raised px-3 py-2 text-left text-[15px]">
                    {badge}
                    <span className={cn(isDone && "text-muted line-through")}>{s}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-[15px]">
                    {badge}
                    <span>{s}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-2.5 rounded-lg border-2 border-line-strong bg-raised p-3.5" aria-label={t("testersOf", { count: app.testers, slots: app.slots })}>
        <div className="flex items-center justify-between gap-3">
          <AvatarGroup>
            {app.testerAvatars.map((p) => (
              <Avatar key={p.id} initials={initials(p.name)} size="sm" />
            ))}
            {others > 0 && <Avatar initials={`+${others}`} size="sm" tone="neutral" />}
          </AvatarGroup>
          <span className="text-[13px] font-extrabold text-brand-text">{t("testersOf", { count: app.testers, slots: app.slots })}</span>
        </div>
        <Meter value={app.slots ? app.testers / app.slots : 0} label={t("testersOf", { count: app.testers, slots: app.slots })} />
      </section>

      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}

      <ActionBar>
        {owner ? (
          <>
            <ButtonLink href={`/tests/${app.id}/rapports`} size="lg" block>
              {t("seeReports")}
            </ButtonLink>
            {app.conversationId && (
              <ButtonLink href={`/messages/${app.conversationId}`} variant="secondary" block>
                {t("openGroup")}
              </ButtonLink>
            )}
          </>
        ) : app.joined ? (
          <>
            {canReport ? (
              <ButtonLink href={`/tests/${app.id}/rapport`} size="lg" block>
                {t("sendReport")}
              </ButtonLink>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {app.conversationId && (
                <ButtonLink href={`/messages/${app.conversationId}`} variant={canReport ? "secondary" : "primary"} block>
                  {t("openGroup")}
                </ButtonLink>
              )}
              {!app.myReport && (
                <Button variant="secondary" block disabled={busy} onClick={leave}>
                  {t("leave")}
                </Button>
              )}
            </div>
          </>
        ) : app.slotsLeft > 0 ? (
          <>
            <Button size="lg" block disabled={busy} onClick={join}>
              {busy ? t("joining") : t("join")}
            </Button>
            <p className="text-center text-[13px] text-muted">{t("joinHelp")}</p>
          </>
        ) : (
          <Button size="lg" block disabled>
            {t("full")}
          </Button>
        )}
      </ActionBar>
    </>
  );
}
