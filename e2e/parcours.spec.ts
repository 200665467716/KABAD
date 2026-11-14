import { expect, test, type Browser, type Page } from "@playwright/test";
import { ACCOUNTS, type AccountId } from "./accounts";

/* Journeys that change data: one worker, in order, on the demo data reset by e2e/global-setup.ts. */
test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: AccountId, next = "/accueil"): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto(`/connexion?suite=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(ACCOUNTS[who].email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(ACCOUNTS[who].password);
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
  await expect(page.getByText("Lien envoyé. Pense à regarder dans tes spams.")).toBeVisible();
});

test("mentorat : Koffi lit la fiche d’Aïcha, réserve un créneau, Aïcha accepte, la séance est confirmée", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi", "/mentorat/mentors/aicha");
  // M2, the mentor's sheet: what the team checked for the badge, then « Réserver une séance » leads to the calendar (M3).
  await expect(koffi.getByText("Vérifiée par KABAD")).toBeVisible();
  await expect(koffi.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", /linkedin\.com/);
  await koffi.getByRole("link", { name: "Réserver une séance" }).click();
  await expect(koffi).toHaveURL(/\/mentorat\/mentors\/aicha\/creneaux$/);
  const hours = koffi.getByRole("main").getByRole("group", { name: "Heures disponibles" });
  await hours.getByRole("button").first().click();
  await koffi.getByRole("link", { name: /Continuer/ }).click();
  await expect(koffi).toHaveURL(/\/reserver\?creneau=/);
  await koffi.getByLabel("Sujet de la séance").fill("Rendre mon app Flutter utilisable en 3G");
  await koffi.getByLabel("Ton problème précis").fill("Mes écrans se figent quand la connexion coupe pendant un envoi de formulaire.");
  await koffi.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(koffi.getByRole("heading", { name: "Demande envoyée" }).first()).toBeVisible();
  const sessionUrl = koffi.url();

  const aicha = await signIn(browser, "aicha", "/mentorat/demandes");
  await expect(aicha.getByText("Rendre mon app Flutter utilisable en 3G")).toBeVisible();
  await aicha.getByRole("button", { name: "Accepter" }).first().click();
  // M6 → M7: once accepted, the mentor lands on the confirmed session.
  await expect(aicha).toHaveURL(/\/mentorat\/seances\//);
  await expect(aicha.getByRole("heading", { name: "Séance confirmée" }).first()).toBeVisible();

  await koffi.goto(sessionUrl);
  await expect(koffi.getByRole("heading", { name: "Séance confirmée" }).first()).toBeVisible();
  await expect(koffi.getByRole("link", { name: /Rejoindre sur Google Meet/ })).toBeVisible();
  await koffi.context().close();
  await aicha.context().close();
});

test("badge mentor : la demande de Nadia est validée par l’équipe, qui la voit disparaître de la file", async ({ browser }) => {
  const team = await signIn(browser, "equipe", "/admin/badges");
  await team.getByRole("link", { name: /Nadia Kouassi/ }).click();
  await team.getByRole("button", { name: "Valider le badge" }).click();
  await expect(team).toHaveURL(/\/admin\/badges$/);
  await expect(team.getByRole("link", { name: /Nadia Kouassi/ })).toHaveCount(0);
  await team.context().close();

  const nadia = await signIn(browser, "nadia", "/mentorat/badge");
  await expect(nadia.getByText(/Tu es mentor KABAD/i)).toBeVisible();
  await nadia.context().close();
});

test("hackathon : Aminata demande à rejoindre l’équipe Kora, son chef l’accepte", async ({ browser }) => {
  // Aminata: her instructor mission is only proposed. Aïcha, an accepted instructor, may not take part.
  const aminata = await signIn(browser, "aminata", "/hackathons/fintech-inclusion/participer");
  await aminata.getByRole("radio", { name: /Rejoindre une équipe/ }).check();
  // H3: the rules first, then "Demander" on the team sends the request at once.
  await aminata.getByRole("checkbox", { name: /J’accepte/ }).check();
  await aminata.getByRole("listitem").filter({ hasText: "Équipe Kora" }).getByRole("button", { name: /Demander/ }).click();
  await expect(aminata.getByText("Demande envoyée.")).toBeVisible();

  const chidi = await signIn(browser, "chidi", "/hackathons/fintech-inclusion/equipe");
  await chidi.getByRole("button", { name: "Accepter" }).first().click();
  // Aminata's name is already on the request: wait for the answer to be saved, the request then leaves the list.
  await expect(chidi.getByRole("button", { name: "Accepter" })).toHaveCount(0);
  await expect(chidi.getByText("Aminata Traoré")).toBeVisible();
  // H4: the team has its discussion in the messaging; Aminata, just accepted, is in it.
  await chidi.getByRole("button", { name: "Discussion de l’équipe" }).click();
  await expect(chidi.getByRole("heading", { name: "Équipe Kora" })).toBeVisible();
  await chidi.getByRole("button", { name: "Infos du groupe" }).click();
  await expect(chidi.getByRole("dialog").getByRole("link", { name: "Aminata Traoré" })).toBeVisible();
  await expect(chidi.getByRole("dialog").getByRole("link", { name: "Voir mon équipe" })).toBeVisible();
  await aminata.context().close();
  await chidi.context().close();
});

test("le jury note une solution sur 20", async ({ browser }) => {
  const page = await signIn(browser, "kwame", "/hackathons/raccourcisseur/jury");
  for (const criterion of ["Ça fonctionne", "Qualité du code", "Tests", "Explication"]) await page.getByRole("button", { name: `${criterion} : 4 sur 5` }).click();
  await expect(page.getByText("16 / 20")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer et suivante" }).click();
  await expect(page.getByText(/Note de la solution n° \d enregistrée/)).toBeVisible();
  await page.context().close();
});

test("Africa Rise-Up : rejoindre un projet, y écrire, proposer un salon que le responsable valide", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi", "/rise-up/prix-recoltes");
  await koffi.getByRole("button", { name: /Rejoindre le projet/ }).click();
  const text = `Je peux brancher la passerelle SMS (${Date.now()})`;
  await koffi.getByRole("textbox").first().fill(text);
  await koffi.getByRole("button", { name: /Publier/ }).click();
  await expect(koffi.getByText(text)).toBeVisible();

  // P5: a member proposes a room on a Google Meet link (another service is refused); it waits for a lead.
  await koffi.getByRole("button", { name: "Proposer un salon" }).click();
  await koffi.getByLabel("Lien Google Meet").fill("https://zoom.us/j/1");
  await koffi.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(koffi.getByText(/Colle un lien Google Meet/)).toBeVisible();
  await koffi.getByLabel("Lien Google Meet").fill("meet.google.com/abc-defg-hij");
  await koffi.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(koffi.getByText("En attente de validation par un responsable du projet.")).toBeVisible();
  await expect(koffi.getByText("Salon en direct")).toHaveCount(0);

  // Chidi leads the project: he approves it, and the room is live for the members.
  const chidi = await signIn(browser, "chidi", "/rise-up/prix-recoltes");
  await expect(chidi.getByRole("heading", { name: "Salons à valider" })).toBeVisible();
  await chidi.getByRole("button", { name: "Valider" }).click();
  await expect(chidi.getByText("Salon en direct")).toBeVisible();

  await koffi.reload();
  await expect(koffi.getByText("Salon en direct")).toBeVisible();
  await expect(koffi.getByRole("link", { name: "Rejoindre la visio" })).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await expect(koffi.getByRole("button", { name: "Proposer un salon" })).toHaveCount(0);
  await koffi.context().close();
  await chidi.context().close();
});

test("tests d’apps : rejoindre le groupe de testeurs puis cocher une étape", async ({ browser }) => {
  const page = await signIn(browser, "koffi", "/tests/tontine-app");
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
  const page = await signIn(browser, "koffi", "/hackathons/organiser");
  const local = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 11) + "09:00";
  // Each step is checked before the next one: every error at once, the focus on the first field in error.
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByLabel("Nom du hackathon")).toBeFocused();
  await expect(page.getByText("Indique les technologies attendues.")).toBeVisible();
  await expect(page.getByText("Indique la clôture des inscriptions.")).toBeVisible();
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
  await page.getByRole("button", { name: "Proposer la mission à Aminata Traoré" }).click();
  await expect(page.getByRole("button", { name: "Mission proposée à Aminata Traoré" })).toHaveText("Proposée");
  await expect(page.getByText("1 proposée")).toBeVisible();
  await page.getByRole("button", { name: "Proposer le hackathon" }).click();
  await expect(page).toHaveURL(/\/hackathons\/sante-connectee-[0-9a-f]{6}$/);
  await expect(page.getByText("Pas de prix pour ce hackathon.")).toBeVisible();
  await page.context().close();
});

test("l’annuaire : trouver un membre et l’inviter", async ({ browser }) => {
  const page = await signIn(browser, "koffi", "/membres");
  await page.getByLabel("Rechercher un membre").fill("Kwame");
  await page.getByRole("button", { name: "Chercher" }).click();
  await page.getByRole("button", { name: "Inviter Kwame Asante" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Bonjour Kwame, j’aimerais ton avis sur mon hébergement.");
  await page.getByRole("dialog").getByRole("button", { name: /Envoyer/ }).click();
  await expect(page.getByRole("button", { name: /Invitation envoyée/ })).toBeVisible();
  await page.context().close();
});

test("modération : un message signalé est retiré par l’équipe et n’est plus lisible", async ({ browser }) => {
  const koffi = await signIn(browser, "koffi", "/messages");
  await koffi.getByRole("link", { name: /Devs fintech Lomé/ }).click();
  const thread = koffi.getByRole("main", { name: "Messages" });
  await expect(thread.getByText("J’ajoute la gestion des doublons ce soir.")).toBeVisible();
  await thread.getByRole("button", { name: /Signaler/ }).last().click();
  await koffi.getByRole("radio", { name: "Spam ou arnaque" }).check();
  await koffi.getByRole("button", { name: /Envoyer le signalement/ }).click();
  await expect(koffi.getByText("L’équipe KABAD l’examine.")).toBeVisible();

  const team = await signIn(browser, "equipe", "/admin/signalements");
  await expect(team.getByText("J’ajoute la gestion des doublons ce soir.")).toBeVisible();
  await team.getByRole("button", { name: "Retirer le message" }).click();
  await expect(team.getByText("Aucun signalement à traiter.")).toBeVisible();

  await koffi.reload();
  await expect(koffi.getByRole("main", { name: "Messages" }).getByText("Message retiré par la modération.")).toBeVisible();
  await expect(koffi.getByRole("main", { name: "Messages" }).getByText("J’ajoute la gestion des doublons ce soir.")).toHaveCount(0);
  await koffi.context().close();
  await team.context().close();
});

test("la version anglaise garde la langue d’une page à l’autre", async ({ browser }) => {
  const page = await signIn(browser, "koffi");
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
