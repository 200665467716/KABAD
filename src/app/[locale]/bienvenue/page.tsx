import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { Band } from "@/components/ui/Band";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";

const card = "relative rounded-2xl border-2 border-line-strong text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.welcome"))("metaTitle") };
}

/**
 * Screen A1: where a visitor chooses to create an account or to sign in. The landing page (/) leads here
 * with « Rejoindre la communauté ». The three cards illustrate the three spaces of KABAD.
 */
export default async function Welcome() {
  const t = await getTranslations("auth.welcome");
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-header text-on-header">
      <svg viewBox="0 0 64 64" aria-hidden="true" className="pointer-events-none absolute top-10 -right-18 size-[330px] opacity-55 lg:right-[8%] lg:size-[520px]">
        <g fill="var(--band)">
          <rect x="16" y="13" width="8" height="6" rx="1.5" />
          <rect x="38" y="13" width="10" height="6" rx="1.5" />
          <rect x="16" y="21" width="8" height="6" rx="1.5" />
          <rect x="32" y="21" width="10" height="6" rx="1.5" />
          <rect x="16" y="29" width="20" height="6" rx="1.5" />
          <rect x="16" y="37" width="8" height="6" rx="1.5" />
          <rect x="32" y="37" width="10" height="6" rx="1.5" />
          <rect x="16" y="45" width="8" height="6" rx="1.5" />
          <rect x="38" y="45" width="10" height="6" rx="1.5" />
        </g>
      </svg>

      <header className="relative mx-auto flex w-full max-w-[1100px] items-center gap-2.5 px-5 pt-[max(18px,env(safe-area-inset-top,0px))] lg:px-10">
        <LogoMark size={34} inverse />
        <span className="flex-1 font-display text-lg font-extrabold tracking-[0.02em]">KABAD</span>
        <LanguageSwitcher compact />
        <Link href="/connexion" className="inline-flex min-h-11 items-center px-2 text-sm font-extrabold text-on-header no-underline">
          {t("signIn")}
        </Link>
      </header>

      <main className="relative mx-auto grid w-full max-w-[1100px] flex-1 content-center gap-6 px-5 py-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:px-10">
        <div aria-hidden="true" className="grid content-center gap-6 py-2 lg:order-2">
          <div className={`${card} flex w-[246px] -rotate-3 items-center gap-2.5 justify-self-start bg-white p-2.5`}>
            <span className="grid size-13 shrink-0 content-center justify-items-center rounded-md bg-[var(--indigo)] text-white">
              <b className="font-display text-[15px] leading-[18px]">15h</b>
              <span className="text-[10px] font-extrabold text-[var(--mist)]">{t("cardLength")}</span>
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-[10px] font-extrabold tracking-[0.1em] text-[var(--indigo)] uppercase">{t("cardMentoring")}</span>
              <b className="text-sm leading-[18px]">{t("cardMentoringTitle")}</b>
              <span className="text-xs text-[var(--slate)]">{t("cardMentoringWith")}</span>
            </span>
          </div>
          <div className={`${card} grid w-[236px] rotate-3 grid-cols-[minmax(0,1fr)_62px] justify-self-end overflow-hidden bg-white`}>
            <span className="grid gap-0.5 px-3 py-2.5">
              <span className="text-[10px] font-extrabold tracking-[0.1em] text-[var(--indigo)] uppercase">{t("cardHackathon")}</span>
              <b className="font-display text-[13px] leading-[17px] font-bold">{t("cardHackathonTitle")}</b>
              <span className="text-[11px] text-[var(--slate)]">{t("cardHackathonBy")}</span>
            </span>
            <span className="grid content-center justify-items-center border-l-2 border-dashed border-white bg-[var(--ink)] text-[var(--maize)]">
              <span className="text-[9px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{t("cardIn")}</span>
              <b className="font-display text-xl leading-[22px]">12</b>
              <span className="text-[9px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{t("cardDays")}</span>
            </span>
          </div>
          <div className={`${card} ml-3.5 flex w-[250px] -rotate-2 items-center gap-2.5 justify-self-start bg-[var(--maize)] px-3 py-2.5`}>
            <Icon name="rise" className="size-10 shrink-0" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-[10px] font-extrabold tracking-[0.1em] uppercase">{t("cardRise")}</span>
              <b className="text-sm leading-[18px]">{t("cardRiseTitle")}</b>
            </span>
            <span className="absolute -top-3 right-2.5 inline-flex h-5.5 items-center gap-1.5 rounded-[7px] bg-[var(--ink)] px-2 text-[10px] font-extrabold text-white">
              <span className="size-1.5 rounded-full bg-[var(--clay-light)]" />
              {t("cardLive")}
            </span>
          </div>
        </div>

        <div className="grid gap-2.5 lg:order-1 lg:gap-5">
          <p className="text-[11px] font-extrabold tracking-[0.1em] text-on-header-muted uppercase lg:text-xs">{t("kicker")}</p>
          <h1 className="font-display text-[27px] leading-[33px] font-extrabold uppercase lg:text-5xl lg:leading-[56px]">
            {t("titleStart")}
            <span className="shadow-[inset_0_-9px_0_var(--maize)]">{t("titleHighlight")}</span>
          </h1>
          <p className="text-[17px] leading-[25px] font-bold lg:text-xl">{t("subtitle")}</p>
        </div>
      </main>

      <div className="relative bg-band pb-[max(24px,env(safe-area-inset-bottom,0px))]">
        <Band className="absolute top-0 left-0 h-3.5" />
        <div className="mx-auto grid w-full max-w-[1100px] gap-2.5 px-5 pt-7 lg:max-w-[480px]">
          <Link
            href="/inscription"
            className="flex h-13.5 items-center justify-center gap-2 rounded-action border-2 border-[var(--ink)] bg-white font-extrabold text-[var(--indigo)] no-underline shadow-[4px_4px_0_var(--ink)]"
          >
            {t("create")}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <p className="mt-1 text-center text-[13px] font-bold text-on-header-muted">{t("motto")}</p>
        </div>
      </div>
    </div>
  );
}
