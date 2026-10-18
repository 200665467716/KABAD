import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/inscription",
  "/inscription/profil",
  "/inscription/recommandations",
  "/connexion",
  "/accueil",
  "/notifications",
  "/profil/awa",
  "/mentorat",
  "/mentorat/mentors",
  "/mentorat/demande/awa",
  "/mentorat/seances/s4",
  "/capsules",
  "/defis",
  "/defis/api-mobile-money",
  "/defis/api-mobile-money/soumettre",
  "/defis/raccourcisseur/jury",
  "/defis/inscription-accessible/resultats",
  "/tests",
  "/tests/marche-vert",
  "/tests/marche-vert/rapport",
  "/tests/marche-vert/rapports",
  "/soutenir/api-mobile-money",
];

test.describe("chaque écran", () => {
  for (const route of ROUTES) {
    test(`${route} s’affiche sans défilement horizontal`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
});

test("l’inscription crée le compte puis mène au profil et aux recommandations", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill("Ama Diaka");
  await page.getByLabel("Adresse e-mail").fill(`ama.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exemple.gh`);
  await page.getByLabel("Mot de passe").fill("court");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByText("au moins 12 caractères")).toBeVisible();
  await page.getByLabel("Mot de passe").fill("un-mot-de-passe-solide");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page).toHaveURL(/\/inscription\/profil$/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/inscription\/recommandations$/);
});

test("une invitation demande d’être connecté et limite le premier message à 300 caractères", async ({ page }) => {
  await page.goto("/inscription/recommandations");
  await page.getByRole("button", { name: "Inviter Moussa Traoré" }).click();
  await page.getByLabel("Votre premier message").fill("x".repeat(320));
  await expect(page.getByText("300 / 300")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer l’invitation" }).click();
  await expect(page.getByText("Connectez-vous pour continuer.")).toBeVisible();
});

test("confirmer la dernière séance ouvre les défis à cagnotte", async ({ page }) => {
  await page.goto("/defis/api-mobile-money");
  await expect(page.getByText("Encore 1 h 30 de mentorat.")).toBeVisible();
  await page.goto("/mentorat/seances/s4");
  await page.getByRole("button", { name: "Je confirme la séance" }).click();
  await expect(page.getByText("Séance comptée.")).toBeVisible();
  await page.goto("/defis/api-mobile-money");
  await expect(page.getByText("Vous pouvez participer.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Participer au défi" })).toBeVisible();
});

test("la messagerie demande d’être connecté", async ({ page }) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/connexion\?suite=%2Fmessages$/);
});

test("le jury note une solution sur 20", async ({ page }) => {
  await page.goto("/defis/raccourcisseur/jury");
  await page.getByRole("button", { name: "Tests : 5 sur 5" }).click();
  await expect(page.getByText("18 / 20")).toBeVisible();
});

test("le sponsor ne peut pas contribuer sous le minimum", async ({ page }) => {
  await page.goto("/soutenir/api-mobile-money");
  await page.getByLabel("Autre montant (F CFA)").fill("100");
  await page.getByRole("button", { name: /^Contribuer/ }).click();
  await expect(page.getByText("Le montant minimum")).toBeVisible();
});
