// Fails when a dependency uses a reciprocal licence banned by the CADEV rules (GPL, AGPL, LGPL).
// Runtime dependencies are blocking. Build tools are reported too, so the team can answer the organisers.
import { execFileSync } from "node:child_process";

const BANNED = /\b(A?GPL|LGPL)\b/i;
const WEAK_COPYLEFT = /\b(MPL|EPL|CDDL)\b/i;

function scan(production) {
  const args = ["license-checker-rseidelsohn", "--json", "--excludePrivatePackages"];
  if (production) args.push("--production");
  const out = execFileSync("npx", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return Object.entries(JSON.parse(out)).map(([name, info]) => ({ name, licenses: String(info.licenses) }));
}

const runtime = scan(true);
const all = scan(false);
const runtimeNames = new Set(runtime.map((p) => p.name));

const bannedRuntime = runtime.filter((p) => BANNED.test(p.licenses));
const bannedBuild = all.filter((p) => !runtimeNames.has(p.name) && BANNED.test(p.licenses));
const weak = all.filter((p) => WEAK_COPYLEFT.test(p.licenses));

console.log(`Dépendances d’exécution analysées : ${runtime.length}`);
console.log(`Dépendances au total (outils compris) : ${all.length}`);

if (weak.length) {
  console.log("\nÀ signaler aux organisateurs (copyleft faible, outils de construction uniquement) :");
  for (const p of weak) console.log(`  - ${p.name} : ${p.licenses}${runtimeNames.has(p.name) ? " (exécution)" : ""}`);
}

if (bannedBuild.length) {
  console.log("\nLicence interdite dans un outil de développement :");
  for (const p of bannedBuild) console.log(`  - ${p.name} : ${p.licenses}`);
}

if (bannedRuntime.length) {
  console.error("\nÉCHEC : licence interdite dans une dépendance d’exécution :");
  for (const p of bannedRuntime) console.error(`  - ${p.name} : ${p.licenses}`);
  process.exit(1);
}

if (bannedBuild.length) process.exit(1);
console.log("\nAucune licence GPL, AGPL ou LGPL.");
