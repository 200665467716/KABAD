"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Band } from "@/components/ui/Band";
import { CodeBars } from "./CodeBars";
import { landingSample } from "./content";
import { LpIcon } from "./LpIcon";

const TABS = [
  { id: "mentor", key: "mentoring", icon: "people", tone: "" },
  { id: "hack", key: "hackathons", icon: "trophy", tone: "hack" },
  { id: "test", key: "tests", icon: "clipboard", tone: "test" },
  { id: "msg", key: "messaging", icon: "bubble", tone: "msg" },
  { id: "rise", key: "rise", icon: "sprout", tone: "rise" },
] as const;

/** Six seconds per feature; the rotation stops for good as soon as the visitor touches the section. */
const ROTATE_MS = 6000;

/**
 * Section « Fonctionnalités » : cinq onglets (tablist ARIA, flèches, Début, Fin) et un téléphone
 * qui montre un écran simplifié de chaque espace. Les onglets tournent seuls tant que la section
 * est visible et que personne n'y a touché ; jamais avec « réduire les animations ».
 */
export function FeatureTabs() {
  const t = useTranslations("landing.features");
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const section = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) timer = setInterval(() => setIndex((i) => (i + 1) % TABS.length), ROTATE_MS);
        else if (!entry.isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(section.current!);
    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [auto]);

  function choose(i: number, focus = false) {
    setAuto(false);
    setIndex(i);
    if (focus) tabs.current[i]?.focus();
  }

  function onKey(e: KeyboardEvent, i: number) {
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    choose((next + TABS.length) % TABS.length, true);
  }

  const current = TABS[index];
  return (
    <div className="feat-grid" ref={section} onPointerDown={() => setAuto(false)} onFocus={() => setAuto(false)}>
      <div className={auto ? "tabs rv" : "tabs rv paused"} role="tablist" aria-label={t("label")} aria-orientation="vertical">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            className="tab"
            role="tab"
            id={`tab-${tab.id}`}
            type="button"
            aria-selected={i === index}
            aria-controls={`scr-${tab.id}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => choose(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={`ti ${tab.tone}`}>
              <LpIcon name={tab.icon} />
            </span>
            <span>
              <span className="tt">{t(tab.key)}</span>
              <span className="td">{t(`${tab.key}Text`)}</span>
            </span>
            <LpIcon name="chevron" className="chev" />
            {/* Restarted with the tab: the bar fills up in 6 s. */}
            <span key={`${index}-${auto}`} className="bar" />
          </button>
        ))}
      </div>

      <div className="stage rv">
        <CodeBars />
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
            <div key={tab.id} className={i === index ? "scr on" : "scr"} id={`scr-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} hidden={i !== index}>
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
