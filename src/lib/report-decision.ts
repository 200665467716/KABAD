/**
 * La décision d'un signalement est enregistrée en français dans `Report.resolution` (« Contenu retiré : note »),
 * et l'était aussi dans le journal d'administration avant ce correctif. On la relit ici pour l'afficher traduite.
 */
export type ReportDecision = "dismiss" | "hide" | "restore" | "warn" | "suspend";

export const DECISION_LABEL: Record<ReportDecision, string> = {
  dismiss: "Classé sans suite",
  hide: "Contenu retiré",
  restore: "Contenu rétabli",
  warn: "Membre averti",
  suspend: "Membre suspendu",
};

/** « Contenu retiré : spam » → { decision: "hide", note: "spam" }. Un texte sans décision connue reste une note. */
export function splitResolution(text: string): { decision: ReportDecision | null; note: string } {
  for (const [decision, label] of Object.entries(DECISION_LABEL) as Array<[ReportDecision, string]>) {
    if (text === label) return { decision, note: "" };
    if (text.startsWith(`${label} : `)) return { decision, note: text.slice(label.length + 3) };
  }
  return { decision: null, note: text };
}
