import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PresentationLauncher } from "@/components/features/landing/PresentationLauncher";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { Band } from "@/components/ui/Band";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.meta");
  return {
    title: { absolute: t("title") },
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "website", siteName: "KABAD" },
  };
}

/** White action with the offset ink shadow, the one action that stands out on the indigo bands. */
const joinButton =
  "inline-flex min-h-13.5 items-center justify-center gap-2 rounded-action border-2 border-[var(--ink)] bg-white px-6 font-extrabold text-[var(--indigo)] no-underline shadow-[4px_4px_0_var(--ink)]";

const features: Array<{ key: "mentoring" | "hackathons" | "tests" | "messaging" | "rise"; icon: IconName; tone: string }> = [
  { key: "mentoring", icon: "users", tone: "bg-[var(--indigo)] text-white" },
  { key: "hackathons", icon: "trophy", tone: "bg-[var(--ink)] text-white" },
  { key: "tests", icon: "screen", tone: "bg-brand-soft text-brand-text" },
  { key: "messaging", icon: "message", tone: "bg-brand-soft text-brand-text" },
  { key: "rise", icon: "rise", tone: "bg-[var(--maize)] text-[var(--maize-deep)]" },
];

/**
 * The public landing page of KABAD: the vision, the mission, the five spaces and the presentation.
 * « Rejoindre la communauté » leads to the welcome screen (A1), where one signs up or signs in.
 * Server-rendered and indexable; only the presentation's play button runs in the browser.
 */
export default async function Landing() {
  const t = await getTranslations("landing");
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="relative overflow-hidden bg-header text-on-header">
        <nav aria-label={t("nav.label")} className="relative mx-auto flex w-full max-w-[1100px] items-center gap-2.5 px-4 pt-[max(16px,env(safe-area-inset-top,0px))] lg:px-10">
          <LogoMark size={34} inverse />
          <span className="flex-1 font-display text-lg font-extrabold tracking-[0.02em]">KABAD</span>
          <LanguageSwitcher compact />
          <Link href="/connexion" className="inline-flex min-h-11 items-center px-2 text-sm font-extrabold text-on-header no-underline">
            {t("nav.signIn")}
          </Link>
        </nav>

        <div className="relative mx-auto grid w-full max-w-[1100px] gap-5 px-4 pt-12 pb-14 lg:px-10 lg:pt-20 lg:pb-24">
          <p className="text-xs font-extrabold tracking-[0.1em] text-on-header-muted uppercase">{t("hero.kicker")}</p>
          <h1 className="max-w-[18ch] font-display text-[30px] leading-[36px] font-extrabold uppercase lg:text-6xl lg:leading-[68px]">
            {t("hero.titleStart")}
            <span className="shadow-[inset_0_-10px_0_var(--maize)]">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="max-w-[34ch] text-[17px] leading-[25px] font-bold lg:text-xl">{t("hero.subtitle")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link href="/bienvenue" className={joinButton}>
              {t("hero.join")}
              <Icon name="chevron" size={18} />
            </Link>
            <a href="#presentation" className="inline-flex min-h-13.5 items-center gap-2 px-3 font-extrabold text-on-header underline-offset-4 hover:underline">
              <Icon name="play" size={18} />
              {t("hero.watch")}
            </a>
          </div>
          <p className="text-sm font-bold text-on-header-muted">{t("hero.motto")}</p>
        </div>
        <Band className="h-4" />
      </header>

      <main className="mx-auto grid w-full max-w-[1100px] gap-16 px-4 py-14 lg:gap-24 lg:px-10 lg:py-20">
        <section id="presentation" aria-labelledby="presentation-title" className="grid scroll-mt-6 gap-5 lg:grid-cols-[1fr_1.6fr] lg:items-center lg:gap-12">
          <Heading id="presentation-title" overline={t("video.overline")} title={t("video.title")}>
            <p className="text-muted">{t("video.lead")}</p>
            <Link href="/presentation" className="justify-self-start text-sm font-extrabold text-brand-text">
              {t("video.fullScreen")}
            </Link>
          </Heading>
          <PresentationLauncher />
        </section>

        <section aria-labelledby="mission-title" className="grid gap-6">
          <Heading id="mission-title" overline={t("mission.overline")} title={t("mission.title")} />
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {(["grow", "solve", "showcase"] as const).map((k, i) => (
              <li key={k} className="grid content-start gap-2 rounded-lg border-2 border-line-strong bg-raised p-4">
                <span className="font-display text-3xl font-extrabold text-brand-text tabular">{i + 1}</span>
                <h3 className="font-display text-md font-extrabold uppercase">{t(`mission.${k}.title`)}</h3>
                <p className="text-sm text-muted">{t(`mission.${k}.text`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features-title" className="grid gap-6">
          <Heading id="features-title" overline={t("features.overline")} title={t("features.title")} />
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li key={f.key} className={cn("grid content-start gap-3 rounded-lg border-2 border-line-strong bg-raised p-4", f.key === "rise" && "sm:col-span-2 lg:col-span-1")}>
                <span className={cn("grid size-11 place-items-center rounded-md", f.tone)} aria-hidden="true">
                  <Icon name={f.icon} />
                </span>
                <h3 className="font-display text-md font-extrabold uppercase">{t(`features.${f.key}.name`)}</h3>
                <p className="text-sm text-muted">{t(`features.${f.key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="audience-title" className="grid gap-6">
          <Heading id="audience-title" overline={t("audience.overline")} title={t("audience.title")} />
          <div className="grid gap-4 md:grid-cols-2">
            <article className="grid content-start gap-2 rounded-lg border-2 border-line-strong bg-raised p-4">
              <h3 className="font-display text-md font-extrabold uppercase">{t("audience.devsTitle")}</h3>
              <p className="text-sm text-muted">{t("audience.devsText")}</p>
              <p className="text-sm font-extrabold text-brand-text">{t("audience.levels")}</p>
            </article>
            <article className="grid content-start gap-2 rounded-lg border-2 border-line-strong bg-raised p-4">
              <h3 className="font-display text-md font-extrabold uppercase">{t("audience.orgsTitle")}</h3>
              <p className="text-sm text-muted">{t("audience.orgsText")}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="steps-title" className="grid gap-6">
          <Heading id="steps-title" overline={t("steps.overline")} title={t("steps.title")} />
          <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
            {(["one", "two", "three"] as const).map((k, i) => (
              <li key={k} className="flex items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-raised">{i + 1}</span>
                <span className="font-bold">{t(`steps.${k}`)}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <section aria-labelledby="final-title" className="relative bg-header text-on-header">
        <Band className="h-4" />
        <div className="mx-auto grid w-full max-w-[1100px] justify-items-start gap-4 px-4 py-14 lg:px-10">
          <h2 id="final-title" className="font-display text-2xl font-extrabold uppercase lg:text-4xl">
            {t("final.title")}
          </h2>
          <p className="max-w-[46ch] font-bold text-on-header-muted">{t("final.text")}</p>
          <Link href="/bienvenue" className={joinButton}>
            {t("final.join")}
            <Icon name="chevron" size={18} />
          </Link>
        </div>
      </section>

      <footer className="bg-[var(--ink)] text-[var(--grey-light)]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 pb-[max(24px,env(safe-area-inset-bottom,0px))] text-sm lg:px-10">
          <span className="font-display font-extrabold text-white">KABAD</span>
          <span className="flex-1">{t("footer.cadev")}</span>
          <Link href="/presentation" className="font-bold text-white">
            {t("footer.presentation")}
          </Link>
          <Link href="/conditions" className="font-bold text-white">
            {t("footer.conditions")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Heading({ id, overline, title, children }: { id: string; overline: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{overline}</p>
      <h2 id={id} className="font-display text-2xl font-extrabold uppercase lg:text-3xl">
        {title}
      </h2>
      {children}
    </div>
  );
}
