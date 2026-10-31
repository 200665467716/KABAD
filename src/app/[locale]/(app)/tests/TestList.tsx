"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppTile } from "@/components/features/AppTile";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { CardLink, Meter, TagList } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import type { TestAppSummary } from "@/lib/domain-types";

/** Screen T1: listings to join, the apps the member is testing and their own listings. */
export function TestList({ toTest, testing, mine }: { toTest: TestAppSummary[]; testing: TestAppSummary[]; mine: TestAppSummary[] }) {
  const t = useTranslations("tests");
  const [tab, setTab] = useState<"listings" | "mine">("listings");
  const toRead = mine.reduce((n, a) => n + a.toRead, 0);
  return (
    <>
      <TopBar title={t("title")} />
      <Page>
        <Segmented
          label={t("tabsLabel")}
          stretch
          className="lg:max-w-[420px]"
          value={tab}
          onChange={setTab}
          items={[
            { value: "listings", label: t("tabListings") },
            { value: "mine", label: t("tabMine"), count: toRead || undefined },
          ]}
        />
        {tab === "listings" ? (
          <>
            <p className="text-[13px] leading-[18px] text-muted">{t("intro")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {toTest.map((a, i) => (
                <CardLink key={a.id} href={`/tests/${a.id}`} className={i === 0 ? "shadow-pop" : undefined}>
                  <div className="flex items-center gap-3">
                    <AppTile app={a} />
                    <span className="grid min-w-0 gap-0.5">
                      <b className="truncate text-base">{a.name}</b>
                      <span className="truncate text-[13px] text-muted">{t("by", { name: a.owner.name })}</span>
                    </span>
                  </div>
                  <TagList items={[...a.platforms.map((p) => t(`platform.${p}`)), t("minutes", { count: a.minutes })]} />
                  <div className="grid gap-1.5">
                    <Meter value={a.slots ? a.testers / a.slots : 0} label={t("testers", { count: a.testers, slots: a.slots })} />
                    <span className="text-[13px] font-extrabold text-brand-text">
                      {t("testers", { count: a.testers, slots: a.slots })} · {t("places", { count: a.slotsLeft })}
                    </span>
                  </div>
                </CardLink>
              ))}
            </div>
            {toTest.length === 0 && <p className="py-8 text-center text-muted">{t("noListings")}</p>}
          </>
        ) : (
          <>
            <h2 className="font-display text-[15px] font-extrabold uppercase">{t("iTest")}</h2>
            {testing.length ? (
              <List>
                {testing.map((a) => (
                  <Row key={a.id} href={`/tests/${a.id}`} app={a} line={t("stepsDone", { done: a.myDoneSteps.length, total: a.stepsCount })} />
                ))}
              </List>
            ) : (
              <p className="text-sm text-muted">{t("noTesting")}</p>
            )}
            <h2 className="font-display text-[15px] font-extrabold uppercase">{t("myListings")}</h2>
            {mine.length ? (
              <List>
                {mine.map((a) => (
                  <Row key={a.id} href={`/tests/${a.id}`} app={a} line={`${t("testers", { count: a.testers, slots: a.slots })} · ${t("feedback", { count: a.reportsCount })} ${t("toRead", { count: a.toRead })}`.trim()} />
                ))}
              </List>
            ) : (
              <p className="text-sm text-muted">{t("noMine")}</p>
            )}
          </>
        )}
        <ButtonLink href="/tests/nouveau" variant="ink" icon="plus" block className="md:w-auto md:justify-self-start">
          {t("publish")}
        </ButtonLink>
      </Page>
    </>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border-2 border-line-strong bg-raised [&>*+*]:border-t-2 [&>*+*]:border-line">{children}</div>;
}

function Row({ href, app, line }: { href: string; app: TestAppSummary; line: string }) {
  return (
    <Link href={href} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg">
      <AppTile app={app} size="sm" />
      <span className="grid min-w-0">
        <b className="truncate text-[15px] leading-5">{app.name}</b>
        <small className="truncate text-[13px] leading-[18px] text-muted">{line}</small>
      </span>
      <Icon name="chevron" size={18} className="text-subtle" />
    </Link>
  );
}
