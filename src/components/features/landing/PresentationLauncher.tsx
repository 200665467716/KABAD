"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";

// The player and its animations are downloaded only when the visitor starts the presentation.
const Presentation = dynamic(() => import("./Presentation").then((m) => m.Presentation), {
  ssr: false,
  loading: () => <Poster />,
});

/** The presentation's first image, with its play button. Nothing else loads before the click. */
export function PresentationLauncher() {
  const t = useTranslations("landing.video");
  const [started, setStarted] = useState(false);
  if (started) return <Presentation />;
  return (
    <Poster>
      <button
        type="button"
        onClick={() => setStarted(true)}
        className="inline-flex min-h-13 items-center gap-2.5 rounded-action border-2 border-[var(--ink)] bg-white px-5 font-extrabold text-[var(--indigo)] shadow-[4px_4px_0_var(--ink)]"
      >
        <Icon name="play" size={20} />
        {t("play")}
        <span className="text-sm text-[var(--slate)] tabular">· {t("duration")}</span>
      </button>
    </Poster>
  );
}

function Poster({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("landing.scenes.intro");
  return (
    <div className="grid aspect-[4/5] w-full place-items-center content-center gap-4 rounded-xl bg-header px-6 text-center text-on-header sm:aspect-video">
      <LogoMark size={72} inverse decorative />
      <p className="font-display text-3xl font-extrabold uppercase">{t("title")}</p>
      <p className="font-bold text-on-header-muted">{t("text")}</p>
      {children}
    </div>
  );
}
