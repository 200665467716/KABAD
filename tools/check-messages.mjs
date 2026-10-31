// Vérifie que le français et l'anglais ont exactement les mêmes clés, fichier par fichier.
import { readdirSync, readFileSync } from "node:fs";

const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const files = ["fr.json", ...readdirSync("messages/fr").map((f) => `fr/${f}`)];
let problems = 0;
for (const f of files) {
  const fr = new Set(keys(JSON.parse(readFileSync(`messages/${f}`, "utf8"))));
  const en = new Set(keys(JSON.parse(readFileSync(`messages/${f.replace(/^fr/, "en")}`, "utf8"))));
  for (const k of fr) if (!en.has(k)) (problems++, console.error(`Manque en anglais : ${f} → ${k}`));
  for (const k of en) if (!fr.has(k)) (problems++, console.error(`Manque en français : ${f} → ${k}`));
}
if (problems) process.exit(1);
console.log("Dictionnaires FR et EN alignés.");
