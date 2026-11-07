/* Pictogrammes de la landing page, repris de la maquette : trait de 2 px, coins arrondis. */
const paths = {
  people: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6",
  clipboard: "M9 4h6v3H9zM9 5.5H6V21h12V5.5h-3M9 14l2 2 4-4",
  bubble: "M4 5h16v11H9l-5 4z",
  sprout: "m6 15-3 3 3 3M18 15l3 3-3 3M12 21V10M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 11c0-3 2-6 6-6 0 3-2 6-6 6z",
  cap: "M12 3 2 8l10 5 10-5-10-5zM6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5M22 8v6",
  chevron: "m9 5 7 7-7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "m5 12 5 5 9-10",
  water: "M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11zM9.5 15a2.5 2.5 0 0 0 2 2.4",
  health: "M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8.4a4.3 4.3 0 0 1 7.5 2.4C19.5 16.4 12 21 12 21zM6 13h3l1.5-3 2 5 1.5-2h3",
  crop: "M12 21V9M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 9c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6zM8 17c1.5 0 3 1 4 2 1-1 2.5-2 4-2",
  plus: "M12 6v12M6 12h12",
  calendar: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 10h18M8 2v4M16 2v4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
} as const;

export type LpIconName = keyof typeof paths;

export function LpIcon({ name, className, strokeWidth = 2 }: { name: LpIconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

/** The KABAD logo as drawn on the landing page: white square, indigo bars, maize bar. */
export function LpLogo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="10" fill="#FFFFFF" />
      <g fill="#283588">
        <rect x="16" y="13" width="8" height="6" rx="1.5" />
        <rect x="38" y="13" width="10" height="6" rx="1.5" />
        <rect x="16" y="21" width="8" height="6" rx="1.5" />
        <rect x="32" y="21" width="10" height="6" rx="1.5" />
        <rect x="16" y="37" width="8" height="6" rx="1.5" />
        <rect x="32" y="37" width="10" height="6" rx="1.5" />
        <rect x="16" y="45" width="8" height="6" rx="1.5" />
        <rect x="38" y="45" width="10" height="6" rx="1.5" />
      </g>
      <rect x="16" y="29" width="20" height="6" rx="1.5" fill="#F2B705" />
    </svg>
  );
}
