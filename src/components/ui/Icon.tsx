import { cn } from "@/lib/cn";

/* 24px stroke icons drawn for KABAD. currentColor, 2px stroke, round ends (charte « Motif »). */
const paths = {
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  rise: "m6 15-3 3 3 3M18 15l3 3-3 3M12 21V10M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 11c0-3 2-6 6-6 0 3-2 6-6 6z",
  paperclip: "m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8",
  play: "M7 4.5v15l12-7.5z",
  pause: "M7 5h3v14H7zM14 5h3v14h-3z",
  stop: "M6 6h12v12H6z",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  screen: "M3 4h18v12H3zM8 20h8M12 16v4",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6",
  clipboard: "M9 4h6v3H9zM9 5.5H6V21h12V5.5h-3M9 14l2 2 4-4",
  message: "M4 5h16v11H9l-5 4z",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21a2 2 0 0 0 4 0",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  back: "M15 5l-7 7 7 7",
  chevron: "m9 5 7 7-7 7",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  check: "m5 12 5 5 9-10",
  checkCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6",
  send: "M4 12 20 4l-6 16-3-7z",
  video: "M3 6h13v12H3zM16 10l5-3v10l-5-3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  code: "m8 8-4 4 4 4M16 8l4 4-4 4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  share: "M12 15V3M7 8l5-5 5 5M5 13v7h14v-7",
  more: "M5 11.5h.01M12 11.5h.01M19 11.5h.01",
  flag: "M5 21V4h11l-2 4 2 4H5",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0",
  users: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6",
  userPlus: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3",
  image: "M3 5h18v14H3zM9 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM21 16l-5-5-9 8",
  question: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01",
  wallet: "M3 6h18v13H3zM16 12.5h2M3 10h18",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  capsule: "M5 4h11l3 3v13H5zM9 10h6M9 14h6M9 18h3",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6",
  micOff: "M15 10V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 4.6 2.5M5 11a7 7 0 0 0 11.2 5.6M19 11a7 7 0 0 1-.7 3M12 18v3M9 21h6M4 4l16 16",
  hand: "M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L3.6 14a1.5 1.5 0 0 1 2.4-1.8L8 14",
  radio: "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8",
} as const;

export type IconName = keyof typeof paths;

type Props = { name: IconName; size?: 16 | 18 | 20 | 24; className?: string; label?: string; strokeWidth?: number };

export function Icon({ name, size = 24, className, label, strokeWidth = 2 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function GithubMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}
