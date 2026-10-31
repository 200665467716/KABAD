import { useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Le bandeau de la charte « Motif » : des barres décalées, comme des lignes de code indentées,
 * qui rappellent aussi un tissage. Toujours en bas de l'en-tête indigo, jamais derrière du texte.
 * Le motif (390 px de large) se répète au lieu de s'étirer, du téléphone au grand écran.
 */
export function Band({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden="true" className={cn("block h-4 w-full shrink-0", className)}>
      <defs>
        <pattern id={id} width="390" height="16" patternUnits="userSpaceOnUse">
          <rect width="390" height="16" fill="var(--band)" />
          <g fill="#f2b705">
            <rect x="0" y="3" width="46" height="4" />
            <rect x="96" y="3" width="22" height="4" />
            <rect x="170" y="3" width="62" height="4" />
            <rect x="290" y="3" width="30" height="4" />
            <rect x="350" y="3" width="40" height="4" />
          </g>
          <g fill="#6f7dd0">
            <rect x="52" y="3" width="38" height="4" />
            <rect x="124" y="3" width="40" height="4" />
            <rect x="238" y="3" width="46" height="4" />
            <rect x="326" y="3" width="18" height="4" />
          </g>
          <g fill="#ffffff" opacity=".85">
            <rect x="20" y="10" width="30" height="4" />
            <rect x="74" y="10" width="56" height="4" />
            <rect x="160" y="10" width="24" height="4" />
            <rect x="212" y="10" width="64" height="4" />
            <rect x="306" y="10" width="44" height="4" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="16" fill={`url(#${id})`} />
    </svg>
  );
}
