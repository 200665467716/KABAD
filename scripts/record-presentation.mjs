// Enregistre la présentation animée de KABAD en fichier vidéo (WebM), pour les réseaux sociaux et le pitch.
// L'application doit tourner (npm run dev ou npm start). Usage :
//   npm run presentation:video                  → dist/presentation-kabad-fr.webm et -en.webm, en 1280 × 720
//   npm run presentation:video -- --vertical    → format téléphone 720 × 1280 (stories, statuts WhatsApp)
// Variable APP_URL pour viser une autre adresse (par défaut http://localhost:3000) ; CHROMIUM_PATH pour
// reprendre un navigateur déjà installé, comme pour les tests e2e (playwright.config.ts).
// Le navigateur est celui de Playwright, déjà utilisé pour les tests e2e : aucune dépendance de plus.
import { chromium } from "@playwright/test";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const base = process.env.APP_URL ?? "http://localhost:3000";
const vertical = process.argv.includes("--vertical");
const size = vertical ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
// Somme des durées des scènes (SCENES dans src/components/features/landing/Presentation.tsx), plus une marge.
const seconds = 40 + 3;
const out = path.resolve("dist");

await mkdir(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const lang of ["fr", "en"]) {
  const dir = path.join(out, `video-${lang}`);
  const context = await browser.newContext({ viewport: size, recordVideo: { dir, size }, reducedMotion: "no-preference" });
  // Le film ne montre ni les boutons ni la barre de progression. Invisibles mais présents : la barre fait avancer les scènes.
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "[data-controls] { opacity: 0 !important; } nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  const page = await context.newPage();
  await page.goto(`${base}${lang === "fr" ? "" : "/en"}/presentation`, { waitUntil: "networkidle" });
  await page.waitForTimeout(seconds * 1000);
  const video = page.video();
  await context.close();
  const file = path.join(out, `presentation-kabad-${lang}${vertical ? "-vertical" : ""}.webm`);
  await rename(await video.path(), file);
  await rm(dir, { recursive: true, force: true });
  console.log(`Vidéo prête : ${path.relative(process.cwd(), file)}`);
}
await browser.close();
