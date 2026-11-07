"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/** The scrolling band under the hero. It pauses on hover, on focus and with its button (WCAG 2.2.2). */
export function Marquee() {
  const t = useTranslations("landing.band");
  const [paused, setPaused] = useState(false);
  const segment = (hidden?: boolean) => (
    <div className="seg" aria-hidden={hidden || undefined}>
      <i />
      {t("s1")}
      <i />
      {t("s2")}
      <i />
      {t("s3")}
    </div>
  );
  return (
    <div className={paused ? "band is-paused" : "band"} role="region" aria-label={t("label")}>
      <button className="band-pause" type="button" aria-pressed={paused} aria-label={paused ? t("resume") : t("pause")} onClick={() => setPaused((p) => !p)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {paused ? <path d="M8 5v14l11-7z" fill="currentColor" /> : <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />}
        </svg>
      </button>
      {/* The segment is written twice so the loop never shows a gap; screen readers hear it once. */}
      <div className="track">
        {segment()}
        {segment(true)}
      </div>
    </div>
  );
}
