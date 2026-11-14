import { expect, test, type Browser, type Page } from "@playwright/test";
import { ACCOUNTS } from "./accounts";

/*
 * Voice rooms with real audio: LiveKit runs locally (livekit-server --dev) and Chromium uses a fake
 * microphone that plays a tone. Two members join the same room; the host brings the listener on stage.
 */
// The host (Kwame) and the listener (Koffi), from the seed (e2e/accounts.ts).
const EMAIL = { moussa: ACCOUNTS.kwame, kossi: ACCOUNTS.koffi } as const;

test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: keyof typeof EMAIL): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 }, permissions: ["microphone"] });
  const page = await context.newPage();
  await page.goto("/connexion?suite=/salons");
  await page.getByLabel("Adresse e-mail").fill(EMAIL[who].email);
  await page.getByLabel("Mot de passe").fill(EMAIL[who].password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/salons");
  return page;
}

test("un salon vocal : l’hôte fait monter un auditeur sur scène, le son passe, puis le retire", async ({ browser }) => {
  const moussa = await signIn(browser, "moussa");
  const kossi = await signIn(browser, "kossi");

  // Moussa opens a room right away.
  await moussa.goto("/salons/nouveau");
  await moussa.getByLabel("Sujet").fill("Questions sur les webhooks");
  await moussa.getByLabel("En une ou deux phrases").fill("On parle des doublons et des signatures.");
  await moussa.getByRole("button", { name: "Ouvrir le salon" }).click();
  await expect(moussa).toHaveURL(/\/salons\/(?!nouveau)[^/]+$/);
  const roomUrl = new URL(moussa.url()).pathname;
  await moussa.getByRole("button", { name: "Rejoindre le salon" }).click();
  await expect(moussa.getByRole("button", { name: "Micro coupé" })).toBeVisible({ timeout: 15_000 });
  await moussa.getByRole("button", { name: "Micro coupé" }).click();
  await expect(moussa.getByRole("button", { name: "Micro ouvert" })).toBeVisible();

  // Kossi finds it live and joins as a listener: he hears Moussa.
  await kossi.goto("/salons");
  await kossi.getByRole("link", { name: /Questions sur les webhooks/ }).click();
  await expect(kossi).toHaveURL(roomUrl);
  await kossi.getByRole("button", { name: "Rejoindre le salon" }).click();
  await expect(kossi.getByRole("button", { name: "Lever la main" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => kossi.locator("audio").count(), { timeout: 15_000 }).toBeGreaterThan(0);
  // A listener cannot publish: no microphone button.
  await expect(kossi.getByRole("button", { name: /Micro/ })).toHaveCount(0);

  // He raises his hand; Moussa sees it live and brings him on stage.
  await kossi.getByRole("button", { name: "Lever la main" }).click();
  await expect(kossi.getByRole("button", { name: "Main levée" })).toBeVisible();
  await expect(moussa.getByRole("img", { name: "a levé la main" })).toBeVisible({ timeout: 10_000 });
  await moussa.getByRole("button", { name: "Sur scène" }).click();
  await expect(kossi.getByRole("button", { name: "Micro coupé" })).toBeVisible({ timeout: 10_000 });
  await kossi.getByRole("button", { name: "Micro coupé" }).click();
  await expect(kossi.getByRole("button", { name: "Micro ouvert" })).toBeVisible();
  // Moussa now receives Kossi's audio.
  await expect.poll(() => moussa.locator("audio").count(), { timeout: 15_000 }).toBeGreaterThan(0);

  // Moussa removes him: Kossi is cut and cannot come back.
  await moussa.getByRole("button", { name: "Retirer Koffi Mensah du salon" }).click();
  await expect(kossi.getByText("L’hôte t’a retiré de ce salon.")).toBeVisible({ timeout: 10_000 });
  await kossi.reload();
  await expect(kossi.getByRole("button", { name: "Tu as été retiré" })).toBeDisabled();

  // Moussa ends the room.
  await moussa.getByRole("button", { name: "Terminer le salon" }).click();
  await expect(moussa.getByText("Terminé", { exact: true })).toBeVisible({ timeout: 10_000 });

  await moussa.context().close();
  await kossi.context().close();
});
