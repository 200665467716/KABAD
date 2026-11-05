"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Band } from "@/components/ui/Band";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import "./presentation.css";

/** Class names of presentation.css. */
const s = { frame: "kp-frame", paused: "kp-paused", up: "kp-up", pop: "kp-pop", left: "kp-left", right: "kp-right", grow: "kp-grow", draw: "kp-draw", fill: "kp-fill", title: "kp-title", titleXl: "kp-titleXl", text: "kp-text", overline: "kp-overline" };

/*
 * La présentation animée de KABAD (« vidéo motion »), écrite en code plutôt qu'en fichier vidéo :
 * quelques kilo-octets au lieu de plusieurs mégas en 4G, nette sur tous les écrans, et traduite.
 * Huit scènes s'enchaînent ; la fin de la barre de progression d'une scène lance la suivante.
 * Texte et illustration côte à côte sur un écran large en paysage, l'un sous l'autre sinon.
 * scripts/record-presentation.mjs l'enregistre en fichier vidéo pour les réseaux sociaux.
 */

type SceneId = "intro" | "vision" | "mentoring" | "hackathons" | "tests" | "messaging" | "rise" | "outro";

/** Duration of each scene, in seconds: about 40 s in all. */
export const SCENES: Array<{ id: SceneId; seconds: number }> = [
  { id: "intro", seconds: 4 },
  { id: "vision", seconds: 5 },
  { id: "mentoring", seconds: 5.5 },
  { id: "hackathons", seconds: 5 },
  { id: "tests", seconds: 5 },
  { id: "messaging", seconds: 5 },
  { id: "rise", seconds: 5.5 },
  { id: "outro", seconds: 5 },
];

/** An animated element: its animation class and its delay in seconds. */
const at = (animation: string, delay = 0, className?: string) => ({ className: cn(animation, className), style: { "--d": `${delay}s` } as CSSProperties });

export function Presentation({ autoPlay = true, fill = false }: { autoPlay?: boolean; fill?: boolean }) {
  const t = useTranslations("landing");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  // Bumped to restart the current scene's animations from the start.
  const [run, setRun] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const scene = SCENES[index];
  const last = index === SCENES.length - 1;

  function goTo(n: number) {
    setIndex(n);
    setRun((r) => r + 1);
  }
  function next() {
    if (last) setPlaying(false);
    else goTo(index + 1);
  }
  function replay() {
    goTo(0);
    setPlaying(true);
  }

  return (
    <section aria-label={t("video.title")} className={cn(s.frame, "@container relative isolate overflow-hidden bg-header text-on-header select-none", fill ? "h-dvh w-full" : "aspect-[4/5] w-full rounded-xl sm:aspect-video")}>
      <div key={`${scene.id}-${run}`} className={cn("absolute inset-0", !playing && s.paused)}>
        <Scene id={scene.id} />
      </div>

      {/* Progress: one segment per scene, also used to jump to a scene. */}
      <div data-controls className="absolute inset-x-0 top-0 z-10 flex gap-1 p-3">
        {SCENES.map((x, i) => (
          <button key={x.id} type="button" onClick={() => goTo(i)} aria-label={t("video.goTo", { n: i + 1 })} aria-current={i === index ? "step" : undefined} className="grid h-6 flex-1 items-center">
            <span className="block h-1 overflow-hidden rounded-full bg-current/30">
              {i < index && <span className="block h-full bg-current" />}
              {i === index && (
                <span
                  key={run}
                  className={cn("block h-full bg-current", !reduced && s.fill, !playing && s.paused)}
                  style={{ animationDuration: `${x.seconds}s` }}
                  onAnimationEnd={() => {
                    if (!reduced && playing) next();
                  }}
                />
              )}
            </span>
          </button>
        ))}
      </div>

      <div data-controls className="absolute right-3 bottom-3 z-10 flex gap-2">
        {reduced && !last && <ControlButton icon="chevron" label={t("video.next")} onClick={next} />}
        {last && !playing ? (
          <ControlButton icon="play" label={t("video.replay")} onClick={replay} />
        ) : (
          !reduced && <ControlButton icon={playing ? "pause" : "play"} label={playing ? t("video.pause") : t("video.resume")} onClick={() => setPlaying((p) => !p)} />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {t("video.scene", { n: index + 1, total: SCENES.length })} : {sceneText(t, scene.id)}
      </p>
    </section>
  );
}

function ControlButton({ icon, label, onClick }: { icon: "play" | "pause" | "chevron"; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-11 place-items-center rounded-full border-2 border-[var(--ink)] bg-white text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
      <Icon name={icon} size={20} />
    </button>
  );
}

/** The text of a scene, for the screen reader and the transcript. */
export function sceneText(t: ReturnType<typeof useTranslations<"landing">>, id: SceneId) {
  return `${t(`scenes.${id}.title`)}. ${id === "intro" || id === "vision" || id === "outro" ? t(`scenes.${id}.text`) : ""}`.trim();
}

/* Scenes */

function Layout({ overline, title, visual, tone }: { overline: string; title: string; visual: ReactNode; tone: "light" | "dark" | "rise" }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center gap-[6cqw] px-[7cqw] pt-14 pb-16 @xl:landscape:flex-row @xl:landscape:items-center @xl:landscape:gap-[5cqw]",
        tone === "light" && "bg-[var(--sand)] text-[var(--ink)]",
        tone === "dark" && "bg-[var(--ink)] text-white",
        tone === "rise" && "bg-[var(--maize)] text-[var(--maize-deep)]",
      )}
    >
      <div className="grid gap-[1.6cqw] @xl:landscape:flex-1">
        <p {...at(s.up, 0.1, cn(s.overline, "font-extrabold uppercase", tone === "light" ? "text-[var(--indigo)]" : tone === "dark" ? "text-[var(--maize)]" : ""))}>{overline}</p>
        <h2 {...at(s.up, 0.3, cn(s.title, "font-display font-extrabold uppercase"))}>{title}</h2>
      </div>
      <div className="grid justify-items-center @xl:landscape:flex-1 @4xl:scale-125">{visual}</div>
    </div>
  );
}

const card = "rounded-[18px] border-2 border-[var(--ink)] bg-white text-[var(--ink)]";

function Scene({ id }: { id: SceneId }) {
  const t = useTranslations("landing.scenes");
  switch (id) {
    case "intro":
    case "outro":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-[3cqw] px-[7cqw] text-center">
          <span {...at(s.pop, 0.1)}>
            <LogoMark size={96} inverse decorative className="size-[16cqw] max-h-28 max-w-28" />
          </span>
          <h2 {...at(s.up, 0.5, cn(id === "intro" ? s.titleXl : s.title, "font-display font-extrabold uppercase"))}>{t(`${id}.title`)}</h2>
          <p {...at(s.up, 0.9, cn(s.text, "font-bold text-on-header-muted"))}>{t(`${id}.text`)}</p>
          <span {...at(s.draw, 1.2, "absolute inset-x-0 bottom-0")}>
            <Band className="h-4" />
          </span>
        </div>
      );
    case "vision":
      return (
        <div className="flex h-full flex-col justify-center gap-[3cqw] px-[8cqw]">
          <h2 {...at(s.up, 0.2, cn(s.title, "max-w-[22ch] font-display font-extrabold uppercase"))}>{t("vision.title")}</h2>
          <span {...at(s.draw, 1, "block h-[1.2cqw] min-h-2 w-[40cqw] rounded-full bg-[var(--maize)]")} />
          <p {...at(s.up, 1.4, cn(s.text, "font-bold"))}>{t("vision.text")}</p>
        </div>
      );
    case "mentoring":
      return (
        <Layout
          tone="light"
          overline={t("mentoring.overline")}
          title={t("mentoring.title")}
          visual={
            <div {...at(s.up, 0.6, cn(card, "grid w-full max-w-[420px] gap-3 p-4 shadow-[5px_5px_0_var(--ink)]"))}>
              <span className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--indigo)]">
                <Icon name="users" size={18} />
                {t("mentoring.topic")}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {["09:00", "10:30", "15:00", "16:30"].map((time, i) => (
                  <span key={time} {...at(s.pop, 0.9 + i * 0.15, cn("grid h-10 place-items-center rounded-[12px] border-2 text-sm font-extrabold tabular", i === 2 ? "border-[var(--indigo)] bg-[var(--indigo)] text-white" : "border-[var(--sand-dark)]"))}>
                    {time}
                  </span>
                ))}
              </div>
              <span {...at(s.pop, 2.6, "inline-flex items-center gap-2 justify-self-start rounded-[8px] bg-[var(--palm-light)] px-2.5 py-1.5 text-sm font-extrabold text-[var(--palm)]")}>
                <Icon name="video" size={18} />
                {t("mentoring.confirmed")}
              </span>
            </div>
          }
        />
      );
    case "hackathons":
      return (
        <Layout
          tone="dark"
          overline={t("hackathons.overline")}
          title={t("hackathons.title")}
          visual={
            <div className="grid w-full max-w-[420px] gap-4">
              <div {...at(s.right, 0.6, cn(card, "grid grid-cols-[minmax(0,1fr)_96px] overflow-hidden"))}>
                <span className="grid content-center gap-1 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.1em] text-[var(--indigo)] uppercase">
                    <Icon name="trophy" size={16} />
                    {t("hackathons.ticket")}
                  </span>
                  <span className="h-2.5 w-4/5 rounded-full bg-[var(--sand-dark)]" />
                  <span className="h-2.5 w-3/5 rounded-full bg-[var(--sand-dark)]" />
                </span>
                <span className="grid content-center justify-items-center border-l-2 border-dashed border-white bg-[var(--ink)] py-3 text-[var(--maize)]">
                  <span className="text-[10px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{t("hackathons.in")}</span>
                  <b className="font-display text-3xl">12</b>
                  <span className="text-[10px] font-extrabold tracking-[0.08em] text-[var(--grey-light)] uppercase">{t("hackathons.days")}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span {...at(s.up, 1.4, "text-sm font-extrabold text-[var(--grey-light)]")}>{t("hackathons.team")}</span>
                <span className="flex -space-x-2">
                  {["AD", "KM", "FS", "CO"].map((x, i) => (
                    <span key={x} {...at(s.pop, 1.6 + i * 0.25, "grid size-11 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--mist)] text-sm font-extrabold text-[var(--ink)]")}>
                      {x}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          }
        />
      );
    case "tests":
      return (
        <Layout
          tone="light"
          overline={t("tests.overline")}
          title={t("tests.title")}
          visual={
            <div {...at(s.up, 0.5, "grid w-[min(260px,70cqw)] gap-2.5 rounded-[28px] border-[3px] border-[var(--ink)] bg-white p-4 text-[var(--ink)]")}>
              <span className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-[var(--ink)]" />
              {[t("tests.step1"), t("tests.step2"), t("tests.step3")].map((step, i) => (
                <span key={step} className="flex items-center gap-2.5 rounded-[12px] border-2 border-[var(--ink)] px-2.5 py-2 text-sm font-bold">
                  <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-extrabold text-white">
                    {i + 1}
                    <span {...at(s.pop, 1.2 + i * 0.8, "absolute inset-0 grid place-items-center rounded-full bg-[var(--palm)]")}>
                      <Icon name="check" size={16} strokeWidth={3} />
                    </span>
                  </span>
                  {step}
                </span>
              ))}
            </div>
          }
        />
      );
    case "messaging":
      return (
        <Layout
          tone="light"
          overline={t("messaging.overline")}
          title={t("messaging.title")}
          visual={
            <div className="grid w-full max-w-[380px] gap-2.5">
              <span {...at(s.left, 0.6, "max-w-[85%] justify-self-start rounded-[18px] rounded-bl-[6px] border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm font-bold text-[var(--ink)]")}>{t("messaging.bubble1")}</span>
              <span {...at(s.right, 1.5, "max-w-[85%] justify-self-end rounded-[18px] rounded-br-[6px] bg-[var(--indigo)] px-3.5 py-2.5 text-sm font-bold text-white")}>{t("messaging.bubble2")}</span>
              <span {...at(s.left, 2.4, "inline-flex items-center gap-2 justify-self-start rounded-[18px] rounded-bl-[6px] border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm font-bold text-[var(--ink)]")}>
                <Icon name="mic" size={18} />
                {t("messaging.bubble3")}
              </span>
            </div>
          }
        />
      );
    case "rise":
      return (
        <Layout
          tone="rise"
          overline={t("rise.overline")}
          title={t("rise.title")}
          visual={
            <div className="grid w-full max-w-[380px] justify-items-center gap-3">
              {/* The sprout grows out of the lines of code. */}
              <span {...at(s.grow, 1.3, "justify-self-end pr-[12%] text-[var(--ink)]")}>
                <Icon name="rise" size={24} className="size-16 @xl:size-20" strokeWidth={1.6} />
              </span>
              <div className="grid w-full gap-2">
                {[70, 45, 85, 55].map((w, i) => (
                  <span key={w} {...at(s.draw, 0.5 + i * 0.15, "block h-3 rounded-full bg-[var(--ink)]")} style={{ width: `${w}%`, marginLeft: `${(i % 2) * 12}%`, "--d": `${0.5 + i * 0.15}s` } as CSSProperties} />
                ))}
              </div>
              <p {...at(s.up, 2.2, "text-center text-sm font-extrabold")}>{t("rise.tags")}</p>
            </div>
          }
        />
      );
  }
}
