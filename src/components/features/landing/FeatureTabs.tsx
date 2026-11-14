"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { Band } from "@/components/ui/Band";
import { landingSample } from "./content";
import { LpIcon } from "./LpIcon";

const TABS = [
  { id: "mentor", key: "mentoring", icon: "people", tone: "" },
  { id: "hack", key: "hackathons", icon: "trophy", tone: "hack" },
  { id: "test", key: "tests", icon: "clipboard", tone: "test" },
  { id: "msg", key: "messaging", icon: "bubble", tone: "msg" },
  { id: "rise", key: "rise", icon: "sprout", tone: "rise" },
] as const;

/**
 * Section « Fonctionnalités » : un accordéon où une seule fonctionnalité est ouverte à la fois.
 * La fonctionnalité ouverte montre sa description, et l'écran qui la représente : dans le téléphone
 * de droite sur ordinateur, sous la description sur téléphone. Chaque titre est un bouton
 * (aria-expanded) ; les flèches, Début et Fin passent d'un titre à l'autre.
 */
export function FeatureTabs() {
  const t = useTranslations("landing.features");
  const [index, setIndex] = useState(0);
  const heads = useRef<Array<HTMLButtonElement | null>>([]);

  /** Opens one feature and closes the other. On a phone, its title is brought back into view once the panel above has closed. */
  function open(i: number) {
    setIndex(i);
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => heads.current[i]?.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" }), 380);
  }

  function onKey(e: KeyboardEvent, i: number) {
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    heads.current[(next + TABS.length) % TABS.length]?.focus();
  }

  const current = TABS[index];
  return (
    <div className="feat-grid">
      {/* The class never changes here: LandingEffects adds « in » by hand, and React would erase it. */}
      <div className="acc rv">
        {TABS.map((tab, i) => {
          const isOpen = i === index;
          return (
            <div key={tab.id} className="acc-item" data-open={isOpen}>
              <h3 className="acc-h">
                <button
                  ref={(el) => {
                    heads.current[i] = el;
                  }}
                  className="tab"
                  id={`tab-${tab.id}`}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`pan-${tab.id}`}
                  onClick={() => open(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <span className={`ti ${tab.tone}`}>
                    <LpIcon name={tab.icon} />
                  </span>
                  <span className="tt">{t(tab.key)}</span>
                  <LpIcon name="chevron" className="chev" />
                </button>
              </h3>
              <div className="acc-p" id={`pan-${tab.id}`} role="region" aria-labelledby={`tab-${tab.id}`} inert={!isOpen}>
                <div className="acc-in">
                  <p className="td">{t(`${tab.key}Text`)}</p>
                  {/* Phones only: the screen of the feature, under its description. */}
                  <div className="acc-phone" aria-hidden="true">
                    <div className="phone">
                      <div className="scr on">
                        <PhoneScreen id={tab.id} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Computers: the screen of the open feature. An illustration of the panel on the left, which says the same thing. */}
      <div className="stage rv" aria-hidden="true">
        <span className="ftag t1">
          <i />
          {t("installable")}
        </span>
        <span className="ftag t2">
          <i />
          {t("mobileFirst")}
        </span>
        <span className="scr-name">{t("screen", { name: t(current.key) })}</span>
        <div className="phone">
          {TABS.map((tab, i) => (
            <div key={tab.id} className={i === index ? "scr on" : "scr"} id={`scr-${tab.id}`}>
              <PhoneScreen id={tab.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Simplified screens of the app, drawn with the charte. The names and figures are examples (content.ts). */
function PhoneScreen({ id }: { id: (typeof TABS)[number]["id"] }) {
  const t = useTranslations("landing.phone");
  const s = landingSample;
  const head = (title: string) => (
    <div className="ph-head">
      <h4>{title}</h4>
      <Band className="h-4" />
    </div>
  );
  switch (id) {
    case "mentor":
      return (
        <>
          {head(t("mentoringTitle"))}
          <div className="ph-body">
            <div className="ph-row">
              <span className="av">{s.mentor.initials}</span>
              <span>
                {t("mentorName", { name: s.mentor.name })}
                <small>{t("timeZone")}</small>
              </span>
            </div>
            <div className="ph-card">
              <div className="t">{t("month")}</div>
              <div className="cal" style={{ marginTop: 10 }}>
                {t("days")
                  .split(",")
                  .map((d, i) => (
                    <span key={`d${i}`}>{d}</span>
                  ))}
                {Array.from({ length: 14 }, (_, i) => (
                  <span key={i} className={i === 10 ? "sel" : [1, 3, 8, 12].includes(i) ? "ok" : undefined}>
                    {i + 2}
                  </span>
                ))}
              </div>
            </div>
            <div className="ph-card">
              <div className="t">{t("slotsOf")}</div>
              <div className="slots" style={{ marginTop: 10 }}>
                {["09:00", "10:30", "11:00", "14:00", "15:00", "16:30"].map((h) => (
                  <span key={h} className={h === "15:00" ? "sel" : undefined}>
                    {h}
                  </span>
                ))}
              </div>
              <div className="ph-btn">{t("book")}</div>
            </div>
          </div>
        </>
      );
    case "hack":
      return (
        <>
          {head(t("hackTitle"))}
          <div className="ph-body">
            <div className="ph-chips">
              <span className="on">{t("all")}</span>
              <span>{t("online")}</span>
              <span>{t("onsite")}</span>
              <span>{t("hybrid")}</span>
            </div>
            {[
              [t("hack1"), t("hack1Meta"), s.hackathon.days],
              [t("hack2"), t("hack2Meta"), s.hackathon.otherDays],
            ].map(([title, meta, days], i) => (
              <div key={i} className="ph-card">
                <div className="t">{title}</div>
                <div className="s">{meta}</div>
                <div className="s">{t("inDays", { count: Number(days) })}</div>
                {i === 0 && <div className="ph-btn ink">{t("join")}</div>}
              </div>
            ))}
          </div>
        </>
      );
    case "test":
      return (
        <>
          {head(t("testsTitle"))}
          <div className="ph-body">
            <div className="ph-chips">
              <span className="on">{t("listings")}</span>
              <span>{t("myTests")}</span>
            </div>
            {[
              [t("app1"), t("app1Meta")],
              [t("app2"), t("app2Meta")],
            ].map(([title, meta], i) => (
              <div key={i} className="ph-card">
                <div className="t">{title}</div>
                <div className="s">{meta}</div>
                {i === 0 && <div className="ph-btn">{t("testIt")}</div>}
              </div>
            ))}
          </div>
        </>
      );
    case "msg":
      return (
        <>
          {head(t("msgTitle"))}
          <div className="ph-body">
            <div className="bub">{t("bubble1")}</div>
            <div className="bub me">{t("bubble2")}</div>
            <div className="bub">{t("bubble3")}</div>
            <div className="bub me">{t("voice")}</div>
          </div>
        </>
      );
    case "rise":
      return (
        <>
          {head(t("riseTitle"))}
          <div className="ph-body">
            <div className="ph-chips">
              <span className="on">{t("water")}</span>
              <span>{t("health")}</span>
              <span>{t("farming")}</span>
            </div>
            <div className="ph-card">
              <div className="t">{t("rise1")}</div>
              <div className="s">{t("rise1Meta", { devs: s.rise.devs, countries: s.rise.countries })}</div>
              <div className="ph-btn sun">{t("openChannel")}</div>
            </div>
            <div className="ph-card">
              <div className="t">{t("rise2")}</div>
              <div className="s">{t("rise2Meta")}</div>
            </div>
          </div>
        </>
      );
  }
}
