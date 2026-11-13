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
  // A3: six boxes, one per digit; typing moves on, and a pasted code fills them all.
  await page.getByLabel("Chiffre 1").pressSequentially("12");
  await expect(page.getByLabel("Chiffre 2")).toHaveValue("2");
  await expect(page.getByLabel("Chiffre 3")).toBeFocused();
  await page.getByLabel("Chiffre 3").press("Backspace");
  await expect(page.getByLabel("Chiffre 2")).toHaveValue("");
  await page.getByLabel("Chiffre 1").fill("000000");
  await expect(page.getByLabel("Chiffre 6")).toHaveValue("0");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText("Ce code est incorrect ou a expiré.")).toBeVisible();
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

test("mentorat : Kossi lit la fiche d’Aïcha, réserve un créneau, Aïcha accepte, la séance est confirmée", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi.mensah@exemple.tg", "/mentorat/mentors/aicha");
  // M2, the mentor's sheet: what the team checked for the badge, then « Réserver une séance » leads to the calendar (M3).
  await expect(kossi.getByText("Vérifiée par KABAD")).toBeVisible();
  await expect(kossi.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", /linkedin\.com/);
  await kossi.getByRole("link", { name: "Réserver une séance" }).click();
  await expect(kossi).toHaveURL(/\/mentorat\/mentors\/aicha\/creneaux$/);
  const hours = kossi.getByRole("main").getByRole("group", { name: "Heures disponibles" });
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
  await expect(kossi.getByRole("link", { name: /Rejoindre sur Google Meet/ })).toBeVisible();
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

test("hackathon : Awa demande à rejoindre l’équipe Kora, son chef l’accepte", async ({ browser }) => {
  // Awa: her instructor mission is only proposed. Aïcha, an accepted instructor, may not take part.
  const awa = await signIn(browser, "awa.diop@exemple.sn", "/hackathons/fintech-inclusion/participer");
  await awa.getByRole("radio", { name: /Rejoindre une équipe/ }).check();
  // H3: the rules first, then "Demander" on the team sends the request at once.
  await awa.getByRole("checkbox", { name: /J’accepte/ }).check();
  await awa.getByRole("listitem").filter({ hasText: "Équipe Kora" }).getByRole("button", { name: /Demander/ }).click();
  await expect(awa.getByText("Demande envoyée.")).toBeVisible();

  const chidi = await signIn(browser, "chidi.okafor@exemple.ng", "/hackathons/fintech-inclusion/equipe");
  await chidi.getByRole("button", { name: "Accepter" }).first().click();
  // Awa's name is already on the request: wait for the answer to be saved, the request then leaves the list.
  await expect(chidi.getByRole("button", { name: "Accepter" })).toHaveCount(0);
  await expect(chidi.getByText("Awa Diop")).toBeVisible();
  // H4: the team has its discussion in the messaging; Awa, just accepted, is in it.
  await chidi.getByRole("button", { name: "Discussion de l’équipe" }).click();
  await expect(chidi.getByRole("heading", { name: "Équipe Kora" })).toBeVisible();
  await chidi.getByRole("button", { name: "Infos du groupe" }).click();
  await expect(chidi.getByRole("dialog").getByRole("link", { name: "Awa Diop" })).toBeVisible();
  await expect(chidi.getByRole("dialog").getByRole("link", { name: "Voir mon équipe" })).toBeVisible();
  await awa.context().close();
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

test("Africa Rise-Up : rejoindre un projet, écrire dans sa discussion, puis lancer un salon sur Google Meet", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/rise-up/prix-recoltes");
  await page.getByRole("button", { name: /Rejoindre le projet/ }).click();
  const text = `Je peux brancher la passerelle SMS (${Date.now()})`;
  await page.getByRole("textbox").first().fill(text);
  await page.getByRole("button", { name: /Publier/ }).click();
  await expect(page.getByText(text)).toBeVisible();

  // A room is a Google Meet call opened now: another service is refused, then the room shows as live.
  await page.getByRole("button", { name: "Lancer un salon" }).click();
  await page.getByLabel("Lien Google Meet").fill("https://zoom.us/j/1");
  await page.getByRole("button", { name: "Ouvrir le salon" }).click();
  await expect(page.getByText(/Colle un lien Google Meet/)).toBeVisible();
  await page.getByLabel("Lien Google Meet").fill("meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Ouvrir le salon" }).click();
  await expect(page.getByText("Salon en direct")).toBeVisible();
  await expect(page.getByRole("link", { name: "Rejoindre la visio" })).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await expect(page.getByRole("button", { name: "Lancer un salon" })).toHaveCount(0);
  await page.context().close();
});

test("tests d’apps : rejoindre le groupe de testeurs puis cocher une étape", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/tests/tontine-app");
  await page.getByRole("button", { name: /Rejoindre le groupe de testeurs/ }).click();
  // Joining opens the testers' group, where the install link is shared.
  await expect(page.getByRole("heading", { name: "Testeurs TontineApp" })).toBeVisible();
  // T4: the tasks are pinned in the group, with the install link; ticking one here is kept on the listing.
  const pinned = page.getByRole("region", { name: "Consignes épinglées" });
  await expect(pinned.getByRole("link", { name: "Installer l’app" })).toBeVisible();
  await pinned.getByRole("checkbox").nth(1).check();
  await expect(pinned.getByText(/· 1\//)).toBeVisible();
  await expect(page.getByPlaceholder("Écrire un retour…")).toBeVisible();
  await page.goto("/tests/tontine-app");
  await expect(page.getByRole("button", { name: /Étape 2 faite/ })).toHaveAttribute("aria-pressed", "true");
  const step = page.getByRole("button", { name: /Créer une tontine/ });
  await step.click();
  await expect(step).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /Créer une tontine/ })).toHaveAttribute("aria-pressed", "true");
  await page.context().close();
});

test("organiser un hackathon en 3 étapes : infos, défi sans prix, instructeurs", async ({ browser }) => {
  const page = await signIn(browser, "kossi.mensah@exemple.tg", "/hackathons/organiser");
  const local = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 11) + "09:00";
  await page.getByLabel("Nom du hackathon").fill("Santé connectée");
  await page.getByLabel("Lieu").fill("Lomé");
  await page.getByLabel("Début").fill(local(10));
  await page.getByLabel("Fin", { exact: true }).fill(local(12));
  await page.getByLabel("Clôture des inscriptions").fill(local(8));
  await page.getByLabel("Technologies").fill("Web ou mobile");
  await page.getByRole("button", { name: "Continuer" }).click();
  // H7: the challenge, and "no prize" instead of a list of prizes.
  await expect(page.getByRole("heading", { name: "Le défi et les prix" })).toBeVisible();
  await page.getByLabel("Le défi proposé").fill("Aider les dispensaires à partager le dossier médical de leurs patients.");
  await page.getByRole("checkbox", { name: "Pas de prix pour ce hackathon" }).check();
  await expect(page.getByLabel("Prix n° 1")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuer" }).click();
  // H8: without a fee, no mentor can be chosen; with one, "Proposer" becomes "Proposée".
  await expect(page.getByRole("heading", { name: "Recrute des instructeurs" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Proposer la mission à/ }).first()).toBeDisabled();
  await page.getByLabel("Rémunération par instructeur (F CFA)").fill("50000");
  await page.getByRole("button", { name: "Proposer la mission à Awa Diop" }).click();
  await expect(page.getByRole("button", { name: "Mission proposée à Awa Diop" })).toHaveText("Proposée");
  await expect(page.getByText("1 proposée")).toBeVisible();
  await page.getByRole("button", { name: "Proposer le hackathon" }).click();
  await expect(page).toHaveURL(/\/hackathons\/sante-connectee-[0-9a-f]{6}$/);
  await expect(page.getByText("Pas de prix pour ce hackathon.")).toBeVisible();
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
