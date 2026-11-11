/*
 * Données d'exemple de la landing page : les noms et les chiffres des cartes d'aperçu.
 * Ce ne sont pas des chiffres réels de KABAD. À remplacer ici, en un seul endroit,
 * quand la plateforme aura ses vrais chiffres.
 */
export const landingSample = {
  mentor: { name: "Awa Diop", initials: "AD" },
  mentee: { name: "Kossi" },
  rise: { devs: 126, countries: 7, members: ["YA", "FS", "CO"] },
  hackathon: { days: 12, otherDays: 30 },
  chat: { initials: "YA" },
} as const;
