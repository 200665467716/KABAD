// Vérifie que le français et l'anglais ont exactement les mêmes clés, fichier par fichier.
import { readdirSync, readFileSync } from "node:fs";

const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const files = ["fr.json", ...readdirSync("messages/fr").map((f) => `fr/${f}`)];
let problems = 0;
for (const f of files) {
  const fr = new Set(keys(JSON.parse(readFileSync(`messages/${f}`, "utf8"))));
  const en = new Set(keys(JSON.parse(readFileSync(`messages/${f.replace(/^fr/, "en")}`, "utf8"))));
  const missing = [...[...fr].filter((k) => !en.has(k)).map((k) => `Manque en anglais : ${f} → ${k}`), ...[...en].filter((k) => !fr.has(k)).map((k) => `Manque en français : ${f} → ${k}`)];
  missing.forEach((m) => console.error(m));
  problems += missing.length;
}
if (problems) process.exit(1);
console.log("Dictionnaires FR et EN alignés.");
