import { expect, test, type Browser, type Page } from "@playwright/test";

/* Journeys that change data: one worker, in order, on the demo data reset by e2e/global-setup.ts. */
test.describe.configure({ mode: "serial" });

const PASSWORD = "kabad-demo-2026";

async function signIn(browser: Browser, email: string, next = "/accueil"): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto(`/connexion?suite=${encodeURIComponent(next)}`);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === next.split("?")[0]);
  return page;
}

test("l’inscription mène au profil ; tant que l’e-mail n’est pas confirmé, on ne peut inviter personne", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill("Ama Diaka");
  await page.getByLabel("Adresse e-mail").fill(`ama.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exemple.gh`);
  await page.getByLabel("Mot de passe").fill("court");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByText("au moins 12 caractères")).toBeVisible();
  await page.getByLabel("Mot de passe").fill("un-mot-de-passe-solide");
  await page.getByRole("checkbox", { name: /J’accepte/ }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page).toHaveURL(/\/inscription\/profil$/);
  await page.getByLabel("Ville").fill("Accra");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/inscription\/recommandations$/);
  await page.getByRole("button", { name: /^Inviter / }).first().click();
  await page.getByLabel("Votre premier message").fill("x".repeat(320));
  await expect(page.getByText("300 / 300")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer l’invitation" }).click();
  await expect(page.getByText("Confirmez d’abord votre adresse e-mail")).toBeVisible();
});

test("mot de passe oublié : même réponse que le compte existe ou non", async ({ page }) => {
  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Adresse e-mail").fill("personne@exemple.org");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByText("Si un compte existe avec cette adresse")).toBeVisible();
});

test("confirmer la dernière séance ouvre les défis à cagnotte", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/defis/api-mobile-money");
  await expect(page.getByText("Encore 1 h 30 de mentorat.")).toBeVisible();
  await page.goto("/mentorat/seances/s4");
  await page.getByRole("button", { name: "Je confirme la séance" }).click();
  await expect(page.getByText("Séance comptée.")).toBeVisible();
  await page.goto("/defis/api-mobile-money");
  await expect(page.getByText("Vous pouvez participer.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Participer au défi" })).toBeVisible();
  await page.context().close();
});

test("le jury note une solution sur 20", async ({ browser }) => {
  const page = await signIn(browser, "moussa.traore@exemple.fr", "/defis/raccourcisseur/jury");
  await page.getByRole("button", { name: "Tests : 5 sur 5" }).click();
  await expect(page.getByText("14 / 20")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer et suivante" }).click();
  await expect(page.getByText(/Note de la solution n° \d enregistrée/)).toBeVisible();
  await page.context().close();
});

test("la page de cagnotte annonce les contributions à venir", async ({ page }) => {
  await page.goto("/soutenir/api-mobile-money");
  await expect(page.getByText("Les contributions en ligne ouvrent bientôt.")).toBeVisible();
});

test("l’annuaire : trouver un membre, l’inviter, voir et annuler l’invitation envoyée", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/membres");
  await page.getByLabel("Rechercher un membre").fill("Nadia");
  await page.getByRole("button", { name: "Chercher" }).click();
  await page.getByRole("button", { name: "Inviter Nadia Bello" }).click();
  await page.getByLabel("Votre premier message").fill("Bonjour Nadia, je voudrais vos conseils sur React Native.");
  await page.getByRole("button", { name: "Envoyer l’invitation" }).click();
  await expect(page.getByRole("button", { name: "Invitation envoyée" })).toBeVisible();
  await page.goto("/messages?onglet=invitations");
  await expect(page.getByRole("link", { name: "Nadia Bello" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler l’invitation à Nadia Bello" }).click();
  await expect(page.getByRole("link", { name: "Nadia Bello" })).toHaveCount(0);
  await page.context().close();
});

test("modération : un message signalé est retiré par l’équipe et n’est plus lisible", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi.mensah@exemple.tg", "/messages");
  await kossi.getByRole("link", { name: /Groupe API Lomé/ }).click();
  const thread = kossi.getByRole("main", { name: "Messages" });
  await expect(thread.getByText("Je regarde ce soir.")).toBeVisible();
  await thread.getByRole("button", { name: "Signaler ce message" }).nth(1).click();
  await kossi.getByRole("radio", { name: "Spam ou arnaque" }).check();
  await kossi.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(kossi.getByText("L’équipe KABAD l’examine.")).toBeVisible();

  const team = await signIn(browser, "equipe@kabad.app", "/admin/signalements");
  await expect(team.getByText("Je regarde ce soir.")).toBeVisible();
  await team.getByRole("button", { name: "Retirer le message" }).click();
  await expect(team.getByText("Aucun signalement à traiter.")).toBeVisible();

  await kossi.reload();
  await expect(kossi.getByRole("main", { name: "Messages" }).getByText("Message retiré par la modération.")).toBeVisible();
  await expect(kossi.getByRole("main", { name: "Messages" }).getByText("Je regarde ce soir.")).toHaveCount(0);
  await kossi.context().close();
  await team.context().close();
});

test("la messagerie demande d’être connecté", async ({ page }) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/connexion\?suite=%2Fmessages$/);
});
