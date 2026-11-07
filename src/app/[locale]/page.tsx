import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Champion } from "@/components/features/landing/Champion";
import { CodeBars } from "@/components/features/landing/CodeBars";
import { landingSample } from "@/components/features/landing/content";
import { FeatureTabs } from "@/components/features/landing/FeatureTabs";
import { LandingEffects } from "@/components/features/landing/LandingEffects";
import { LpIcon, LpLogo, type LpIconName } from "@/components/features/landing/LpIcon";
import { Marquee } from "@/components/features/landing/Marquee";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import "@/components/features/landing/landing.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.meta");
  return {
    title: { absolute: t("title") },
    description: t("description"),
    openGraph: { title: t("title"), description: t("description"), type: "website", siteName: "KABAD" },
  };
}

const Arrow = () => <LpIcon name="arrow" className="ar" strokeWidth={2.4} />;

/**
 * Landing page publique de KABAD (maquette L1). Rendue sur le serveur, statique et indexable ;
 * seuls les effets (barres animées, apparitions, onglets, bande défilante) tournent dans le navigateur.
 * Un membre déjà connecté va directement à son accueil (src/proxy.ts).
 */
export default async function Landing() {
  const t = await getTranslations("landing");
  const s = landingSample;
  const em = (c: ReactNode) => <em>{c}</em>;
  return (
    <div className="lp" id="lp">
      <LandingEffects />
      <a className="skip" href="#pourquoi">
        {t("skip")}
      </a>
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#top" aria-label={t("nav.home")}>
            <LpLogo />
            KABAD
          </a>
          <nav className="nav-links" aria-label={t("nav.label")}>
            <a href="#pourquoi">{t("nav.why")}</a>
            <a href="#fonctionnalites">{t("nav.features")}</a>
            <a href="#comment">{t("nav.how")}</a>
            <a href="#organiser">{t("nav.organize")}</a>
          </nav>
          <div className="nav-cta">
            <span className="nav-lang">
              <LanguageSwitcher compact />
            </span>
            <Link className="btn btn--ghost" href="/connexion">
              {t("nav.signIn")}
            </Link>
            <Link className="btn btn--sun" href="/inscription">
              <span className="l-long">{t("nav.signUp")}</span>
              <span className="l-short">{t("nav.signUpShort")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero" id="hero" aria-labelledby="titre">
          <CodeBars />
          <div className="wrap">
            <div>
              <p className="eyebrow">
                <i />
                {t("hero.eyebrow")}
              </p>
              <h1 className="h1" id="titre">
                {(["l1", "l2", "l3", "l4"] as const).map((k) => (
                  <span key={k} className="ln">
                    <span>{t(`hero.${k}`)}</span>
                  </span>
                ))}
                <span className="ln">
                  <span>{t.rich("hero.l5", { em })}</span>
                </span>
              </h1>
              <p className="lead">{t.rich("hero.lead", { b: (c) => <b>{c}</b> })}</p>
              <div className="hero-cta">
                <Link className="btn btn--sun" id="cta-main" href="/inscription">
                  {t("hero.cta")}
                  <Arrow />
                </Link>
                <a className="btn btn--ghost" href="#fonctionnalites">
                  {t("hero.discover")}
                </a>
              </div>
              <p className="hero-note">
                <LpIcon name="check" />
                {t("hero.note")}
              </p>
            </div>

            <div className="stack" role="group" aria-label={t("hero.preview")}>
              <article className="card c1" data-depth="18">
                <div className="k">
                  {t("hero.mentoringKicker")} <span className="pill ok">{t("hero.confirmed")}</span>
                </div>
                <h3>{t("hero.mentoringTitle")}</h3>
                <p className="m">
                  <span className="av">{s.mentor.initials}</span>
                  {t("hero.mentoringMeta", { name: s.mentor.name })}
                </p>
                <span className="cta">
                  {t("hero.joinCall")}
                  <LpIcon name="arrow" strokeWidth={2.4} />
                </span>
              </article>
              <article className="card c2 rise-card" data-depth="30">
                <div className="k rise">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <LpIcon name="sprout" className="sprout" />
                    {t("hero.riseKicker")}
                  </span>
                  <span className="pill live">
                    <i />
                    {t("hero.live")}
                  </span>
                </div>
                <h3>{t("hero.riseTitle")}</h3>
                <p className="m">
                  {s.rise.members.map((m, i) => (
                    <span key={m} className="av" style={[{ background: "#0D1020", color: "#fff" }, { background: "#283588", color: "#fff" }, { background: "#fff", color: "#0D1020" }][i]}>
                      {m}
                    </span>
                  ))}
                  {t("hero.riseMeta", { devs: s.rise.devs, countries: s.rise.countries })}
                </p>
                <span className="cta" style={{ color: "#2E2203" }}>
                  {t("hero.joinRoom")}
                  <LpIcon name="arrow" strokeWidth={2.4} />
                </span>
              </article>
              <article className="card c3 hack-card" data-depth="12">
                <div className="k hack" style={{ color: "#B6BACD" }}>
                  {t("hero.hackKicker")}
                </div>
                <h3>{t("hero.hackTitle")}</h3>
                <p className="m">{t("hero.hackMeta")}</p>
                <p className="m" style={{ marginTop: 12 }}>
                  <span className="big">
                    <small>{t("hero.in")}</small>
                    {s.hackathon.days}
                    <small>{t("hero.days")}</small>
                  </span>
                </p>
              </article>
            </div>
          </div>
        </section>

        <Marquee />

        <section className="sec" id="pourquoi" aria-labelledby="t-pourquoi">
          <div className="wrap">
            <SectionHead id="t-pourquoi" kicker={t("why.kicker")} title={t("why.title")} lead={t("why.lead")} />
            <div className="why">
              <div className="why-row rv">
                <div>
                  <div className="ico peers">
                    <LpIcon name="people" />
                  </div>
                  <h3>{t("why.peersTitle")}</h3>
                  <p>{t("why.peersText")}</p>
                </div>
                <div className="map rv-stagger">
                  <div className="city hub">
                    <b>{t("why.hub")}</b>
                    <span>{t("why.hubText")}</span>
                  </div>
                  {([1, 2, 3, 4] as const).map((n) => (
                    <div key={n} className="city">
                      <b>{t(`why.city${n}`)}</b>
                      <span>{t(`why.city${n}Text`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="why-row rv">
                <div>
                  <div className="ico mentor">
                    <LpIcon name="cap" />
                  </div>
                  <h3>{t("why.mentorTitle")}</h3>
                  <p>{t("why.mentorText")}</p>
                </div>
                <div className="side rv-stagger">
                  {([1, 2, 3] as const).map((n) => (
                    <div key={n} className="chip">
                      <b>{n}</b>
                      {t(`why.step${n}`)}
                    </div>
                  ))}
                  <div className="chip palm">
                    <b>
                      <LpIcon name="check" />
                    </b>
                    {t("why.step4")}
                  </div>
                </div>
              </div>

              <div className="why-row rv">
                <div>
                  <div className="ico rise">
                    <LpIcon name="sprout" />
                  </div>
                  <h3>{t("why.riseTitle")}</h3>
                  <p>{t("why.riseText")}</p>
                </div>
                <div className="side rv-stagger">
                  {(
                    [
                      ["project1", "water", "#DFE3F7", "#283588"],
                      ["project2", "health", "#F7D9D4", "#A3281B"],
                      ["project3", "crop", "#DDF2E7", "#13724B"],
                      ["project4", "plus", "#0D1020", "#F2B705"],
                    ] as Array<["project1" | "project2" | "project3" | "project4", LpIconName, string, string]>
                  ).map(([k, icon, bg, fg]) => (
                    <div key={k} className="chip">
                      <b style={{ background: bg, color: fg }}>
                        <LpIcon name={icon} />
                      </b>
                      {t(`why.${k}`)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec feat" id="fonctionnalites" aria-labelledby="t-feat">
          <div className="motif" aria-hidden="true">
            <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="pm" width="240" height="68" patternUnits="userSpaceOnUse">
                  <g fill="#283588" opacity=".16">
                    <rect x="0" y="12" width="46" height="8" rx="4" />
                    <rect x="60" y="12" width="90" height="8" rx="4" />
                    <rect x="164" y="12" width="40" height="8" rx="4" />
                    <rect x="24" y="46" width="70" height="8" rx="4" />
                    <rect x="110" y="46" width="30" height="8" rx="4" />
                    <rect x="156" y="46" width="76" height="8" rx="4" />
                  </g>
                  <g fill="#F2B705" opacity=".35">
                    <rect x="214" y="12" width="20" height="8" rx="4" />
                    <rect x="0" y="46" width="14" height="8" rx="4" />
                  </g>
                </pattern>
              </defs>
              <rect width="1440" height="900" fill="url(#pm)" />
            </svg>
          </div>
          <div className="wrap">
            <SectionHead id="t-feat" kicker={t("features.kicker")} title={t("features.title")} lead={t("features.lead")} />
            <FeatureTabs />
          </div>
        </section>

        <section className="sec" id="comment" aria-labelledby="t-how" style={{ paddingBlock: 88 }}>
          <div className="wrap">
            <SectionHead id="t-how" kicker={t("how.kicker")} title={t("how.title")} lead={t("how.lead")} />
            <div className="how rv-stagger">
              <Step n={1} title={t("how.s1Title")} text={t("how.s1Text")} tags={[t("how.free"), t("how.noCard")]} />
              <Step n={2} title={t("how.s2Title")} text={t("how.s2Text")} tags={[t("how.aspirant"), t("how.beginner"), t("how.intermediate"), t("how.senior")]} />
              <Step n={3} title={t("how.s3Title")} text={t("how.s3Text")} tags={[t("how.africa"), t("how.diaspora")]} last />
            </div>
            <div className="how-cta rv">
              <Link className="btn btn--indigo" href="/inscription">
                {t("how.cta")}
                <Arrow />
              </Link>
              <span>{t("how.ctaNote")}</span>
            </div>
          </div>
        </section>

        <section className="sec vision" id="vision" aria-labelledby="t-vision">
          <div className="wrap">
            <div className="rv">
              <p className="kick">{t("vision.kicker")}</p>
              <h2 className="sr">{t("vision.kicker")}</h2>
              <blockquote id="t-vision">{t.rich("vision.quote", { em })}</blockquote>
              <p>{t("vision.text")}</p>
            </div>
            <Champion label={t("vision.illustration")} />
          </div>
          <div className="wrap">
            <div className="pillars rv-stagger">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="pillar">
                  <span className="n" />
                  <b>{t(`vision.p${n}Title`)}</b>
                  <span>{t(`vision.p${n}Text`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="organiser" aria-labelledby="t-org" style={{ paddingBlock: "40px 96px" }}>
          <div className="wrap">
            <div className="org rv">
              <CodeBars />
              <div>
                <p className="kick" style={{ color: "var(--mais)" }}>
                  {t("organize.kicker")}
                </p>
                <h2 id="t-org">{t("organize.title")}</h2>
                <p>{t("organize.text")}</p>
                <div className="hero-cta">
                  <Link className="btn btn--sun" href="/inscription">
                    {t("organize.cta")}
                    <Arrow />
                  </Link>
                </div>
              </div>
              <div className="pts rv-stagger">
                {(
                  [
                    ["p1", "trophy"],
                    ["p2", "people"],
                    ["p3", "calendar"],
                    ["p4", "globe"],
                  ] as const
                ).map(([k, icon]) => (
                  <div key={k} className="pt">
                    <b>
                      <LpIcon name={icon} />
                    </b>
                    {t(`organize.${k}`)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="faq" aria-labelledby="t-faq" style={{ paddingBlock: "0 96px" }}>
          <div className="wrap">
            <SectionHead id="t-faq" kicker={t("faq.kicker")} title={t("faq.title")} />
            <div className="faq rv-stagger">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <details key={n} open={n === 1}>
                  <summary>
                    {t(`faq.q${n}`)}
                    <i aria-hidden="true" />
                  </summary>
                  <div>{t(`faq.a${n}`)}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final" id="rejoindre" aria-labelledby="t-final">
          <CodeBars />
          <div className="wrap">
            <h2 className="rv" id="t-final">
              {t("final.title")}
            </h2>
            <p className="rv">{t("final.text")}</p>
            <div className="hero-cta rv" style={{ marginTop: 4 }}>
              <Link className="btn btn--sun" href="/inscription">
                {t("final.cta")}
                <Arrow />
              </Link>
              <Link className="btn btn--ghost" href="/connexion">
                {t("final.signIn")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a className="logo" href="#top">
            <LpLogo />
            KABAD
          </a>
          <span>{t("footer.tagline")}</span>
          <nav aria-label={t("footer.label")}>
            <a href="#pourquoi">{t("nav.why")}</a>
            <a href="#fonctionnalites">{t("nav.features")}</a>
            <a href="#comment">{t("nav.how")}</a>
            <a href="#organiser">{t("nav.organize")}</a>
            <a href="#faq">{t("nav.faq")}</a>
          </nav>
          <div className="legal">
            {/* Contact and privacy pages: contents to come from the team (placeholders kept on purpose). */}
            <a href="#">{t("footer.contact")}</a>
            <a href="#">{t("footer.privacy")}</a>
            <Link href="/conditions">{t("footer.conditions")}</Link>
            <span>{t("footer.question")}</span>
            <span className="foot-lang">
              <LanguageSwitcher compact />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ id, kicker, title, lead }: { id: string; kicker: string; title: string; lead?: string }) {
  return (
    <div className="sec-head rv">
      <p className="kick">{kicker}</p>
      <h2 id={id}>{title}</h2>
      {lead && <p>{lead}</p>}
    </div>
  );
}

function Step({ n, title, text, tags, last }: { n: number; title: string; text: string; tags: string[]; last?: boolean }) {
  return (
    <div className="step">
      <span className="num">{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="mini">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {!last && <LpIcon name="arrow" className="arrow" strokeWidth={2.4} />}
    </div>
  );
}
