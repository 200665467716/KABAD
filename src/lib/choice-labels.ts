/*
 * Pays et technologies proposés (src/lib/schemas.ts) sont enregistrés en français.
 * La valeur ne change pas ; seul son libellé suit la langue de la page (dictionnaire common.choices).
 */
const KEYS = {
  Bénin: "BJ",
  "Burkina Faso": "BF",
  Cameroun: "CM",
  "Côte d’Ivoire": "CI",
  Ghana: "GH",
  Mali: "ML",
  Niger: "NE",
  Nigeria: "NG",
  "RD Congo": "CD",
  Sénégal: "SN",
  Togo: "TG",
  "Autre pays": "otherCountry",
  "Data et IA": "dataAi",
} as const;

export type ChoiceKey = (typeof KEYS)[keyof typeof KEYS];

/** Le libellé d'un pays ou d'une technologie ; une valeur saisie par le membre reste telle quelle. */
export function choiceLabel(value: string, t: (key: ChoiceKey) => string): string {
  const key = (KEYS as Record<string, ChoiceKey>)[value];
  return key ? t(key) : value;
}
