import { expect, test, type Browser, type Page } from "@playwright/test";

/* Journeys that change data: one worker, in order, on the demo data reset by e2e/global-setup.ts. */
test.describe.configure({ mode: "serial" });

const PASSWORD = "kabad-demo-2026";

async function signIn(browser: Browser, email: string, next = "/accueil"): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto(`/connexion?suite=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === next.split("?")[0]);
  return page;
}

test("l’inscription enchaîne les cinq étapes ; sans e-mail confirmé, on ne peut inviter personne", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill("Ama Diaka");
  await page.getByLabel("E-mail").fill(`ama.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exemple.gh`);
  await page.getByLabel("Mot de passe", { exact: true }).fill("court");
  await page.getByRole("checkbox", { name: /J’accepte/ }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByText(/8 caractères/).first()).toBeVisible();
  await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe-solide-2026");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  // Step 2: the code sent by e-mail (checked in the integration tests). The member can come back to it later.
  await expect(page.getByRole("heading", { name: "Confirme ton e-mail" })).toBeVisible();
  await page.goto("/inscription/profil");
  await page.getByLabel("Pays").selectOption({ index: 1 });
  await page.getByLabel("Ville").fill("Accra");
  await page.getByRole("radio", { name: /Intermédiaire/ }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page).toHaveURL(/\/inscription\/interets$/);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page).toHaveURL(/\/inscription\/recommandations$/);
  await page.getByRole("button", { name: /^Inviter / }).first().click();
  await page.getByRole("dialog").getByRole("textbox").fill("Bonjour, je découvre KABAD.");
  await page.getByRole("dialog").getByRole("button", { name: /Envoyer/ }).click();
  await expect(page.getByText(/Confirme d’abord|Confirme d’abord/)).toBeVisible();
});

test("mot de passe oublié : même réponse que le compte existe ou non", async ({ page }) => {
  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("E-mail").fill("personne@exemple.org");
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByText("Lien envoyé. Pense aussi aux courriers indésirables.")).toBeVisible();
});

test("mentorat : Kossi réserve un créneau d’Aïcha, Aïcha accepte, la séance est confirmée", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi.mensah@exemple.tg", "/mentorat/mentors/aicha");
  const hours = kossi.getByRole("main").getByRole("group").last();
  await hours.getByRole("button").first().click();
  await kossi.getByRole("link", { name: /Continuer/ }).click();
  await expect(kossi).toHaveURL(/\/reserver\?creneau=/);
  await kossi.getByLabel("Sujet de la séance").fill("Rendre mon app Flutter utilisable en 3G");
  await kossi.getByLabel("Ton problème précis").fill("Mes écrans se figent quand la connexion coupe pendant un envoi de formulaire.");
  await kossi.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(kossi.getByRole("heading", { name: "Demande envoyée" }).first()).toBeVisible();
  const sessionUrl = kossi.url();

  const aicha = await signIn(browser, "aicha.kouassi@exemple.ci", "/mentorat/demandes");
  await expect(aicha.getByText("Rendre mon app Flutter utilisable en 3G")).toBeVisible();
  await aicha.getByRole("button", { name: "Accepter" }).first().click();
  // M6 → M7: once accepted, the mentor lands on the confirmed session.
  await expect(aicha).toHaveURL(/\/mentorat\/seances\//);
  await expect(aicha.getByRole("heading", { name: "Séance confirmée" }).first()).toBeVisible();

  await kossi.goto(sessionUrl);
  await expect(kossi.getByRole("heading", { name: "Séance confirmée" }).first()).toBeVisible();
  await expect(kossi.getByRole("link", { name: /Rejoindre la visio/ })).toBeVisible();
  await kossi.context().close();
  await aicha.context().close();
});

test("badge mentor : la demande de Moussa est validée par l’équipe, qui la voit disparaître de la file", async ({ browser }) => {
  const team = await signIn(browser, "equipe@kabad.app", "/admin/badges");
  await team.getByRole("link", { name: /Moussa Traoré/ }).click();
  await team.getByRole("button", { name: "Valider le badge" }).click();
  await expect(team).toHaveURL(/\/admin\/badges$/);
  await expect(team.getByRole("link", { name: /Moussa Traoré/ })).toHaveCount(0);
  await team.context().close();

  const moussa = await signIn(browser, "moussa.traore@exemple.ci", "/mentorat/badge");
  await expect(moussa.getByText(/Tu es mentor KABAD/i)).toBeVisible();
  await moussa.context().close();
});

test("hackathon : Aïcha demande à rejoindre l’équipe Kora, son chef l’accepte", async ({ browser }) => {
  const aicha = await signIn(browser, "aicha.kouassi@exemple.ci", "/hackathons/fintech-inclusion/participer");
  await aicha.getByRole("radio", { name: /Rejoindre une équipe/ }).check();
  await aicha.getByRole("listitem").filter({ hasText: "Équipe Kora" }).getByRole("button", { name: /Demander/ }).click();
  await aicha.getByRole("checkbox", { name: /J’accepte/ }).check();
  await aicha.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(aicha.getByText("Demande envoyée.")).toBeVisible();

  const chidi = await signIn(browser, "chidi.okafor@exemple.ng", "/hackathons/fintech-inclusion/equipe");
  await chidi.getByRole("button", { name: "Accepter" }).first().click();
  await expect(chidi.getByText("Aïcha Kouassi")).toBeVisible();
  await aicha.context().close();
  await chidi.context().close();
});

test("le jury note une solution sur 20", async ({ browser }) => {
  const page = await signIn(browser, "ibrahim.keita@exemple.ml", "/hackathons/raccourcisseur/jury");
  for (const criterion of ["Ça fonctionne", "Qualité du code", "Tests", "Explication"]) await page.getByRole("button", { name: `${criterion} : 4 sur 5` }).click();
  await expect(page.getByText("16 / 20")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer et suivante" }).click();
  await expect(page.getByText(/Note de la solution n° \d enregistrée/)).toBeVisible();
  await page.context().close();
});

test("Africa Rise-Up : rejoindre un projet puis écrire dans sa discussion", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/rise-up/prix-recoltes");
  await page.getByRole("button", { name: /Rejoindre le projet/ }).click();
  const text = `Je peux brancher la passerelle SMS (${Date.now()})`;
  await page.getByRole("textbox").first().fill(text);
  await page.getByRole("button", { name: /Publier/ }).click();
  await expect(page.getByText(text)).toBeVisible();
  await page.context().close();
});

test("tests d’apps : rejoindre le groupe de testeurs puis cocher une étape", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/tests/tontine-app");
  await page.getByRole("button", { name: /Rejoindre le groupe de testeurs/ }).click();
  // Joining opens the testers' group, where the install link is shared.
  await expect(page.getByRole("heading", { name: "Testeurs TontineApp" })).toBeVisible();
  await page.goto("/tests/tontine-app");
  const step = page.getByRole("button", { name: /Créer une tontine/ });
  await step.click();
  await expect(step).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /Créer une tontine/ })).toHaveAttribute("aria-pressed", "true");
  await page.context().close();
});

test("l’annuaire : trouver un membre et l’inviter", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/membres");
  await page.getByLabel("Rechercher un membre").fill("Ibrahim");
  await page.getByRole("button", { name: "Chercher" }).click();
  await page.getByRole("button", { name: "Inviter Ibrahim Keïta" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Bonjour Ibrahim, j’aimerais ton avis sur mon hébergement.");
  await page.getByRole("dialog").getByRole("button", { name: /Envoyer/ }).click();
  await expect(page.getByRole("button", { name: /Invitation envoyée/ })).toBeVisible();
  await page.context().close();
});

test("modération : un message signalé est retiré par l’équipe et n’est plus lisible", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi.mensah@exemple.tg", "/messages");
  await kossi.getByRole("link", { name: /Devs fintech Lomé/ }).click();
  const thread = kossi.getByRole("main", { name: "Messages" });
  await expect(thread.getByText("J’ajoute la gestion des doublons ce soir.")).toBeVisible();
  await thread.getByRole("button", { name: /Signaler/ }).last().click();
  await kossi.getByRole("radio", { name: "Spam ou arnaque" }).check();
  await kossi.getByRole("button", { name: /Envoyer le signalement/ }).click();
  await expect(kossi.getByText("L’équipe KABAD l’examine.")).toBeVisible();

  const team = await signIn(browser, "equipe@kabad.app", "/admin/signalements");
  await expect(team.getByText("J’ajoute la gestion des doublons ce soir.")).toBeVisible();
  await team.getByRole("button", { name: "Retirer le message" }).click();
  await expect(team.getByText("Aucun signalement à traiter.")).toBeVisible();

  await kossi.reload();
  await expect(kossi.getByRole("main", { name: "Messages" }).getByText("Message retiré par la modération.")).toBeVisible();
  await expect(kossi.getByRole("main", { name: "Messages" }).getByText("J’ajoute la gestion des doublons ce soir.")).toHaveCount(0);
  await kossi.context().close();
  await team.context().close();
});

test("la version anglaise garde la langue d’une page à l’autre", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg");
  await page.goto("/en/accueil");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Hackathons" }).click();
  await expect(page).toHaveURL(/\/en\/hackathons$/);
  await page.context().close();
});

test("la messagerie demande d’être connecté", async ({ page }) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/connexion\?suite=%2Fmessages$/);
});
