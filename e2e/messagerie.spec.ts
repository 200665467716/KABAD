import { expect, test, type Browser, type Page } from "@playwright/test";

/*
 * Real messaging: two or three members signed in at the same time, in separate browsers.
 * The demo data is reset before the run (e2e/global-setup.ts). Password of every demo account: kabad-demo-2026.
 */
const PASSWORD = "kabad-demo-2026";
/** Next.js keeps the previous screen hidden in the page: look inside the visible message thread only. */
const thread = (page: Page) => page.getByRole("main", { name: "Messages" });
const EMAIL = { kossi: "kossi.mensah@exemple.tg", moussa: "moussa.traore@exemple.fr", yao: "yao.koffi@exemple.tg" } as const;

test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: keyof typeof EMAIL): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto("/connexion?suite=/messages");
  await page.getByLabel("Adresse e-mail").fill(EMAIL[who]);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  return page;
}

test("la connexion refuse un mauvais mot de passe", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
});

test("un message arrive chez l’autre membre sans recharger la page", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const moussa = await signIn(browser, "moussa");

  await kossi.getByRole("link", { name: /Moussa Traoré/ }).click();
  await moussa.getByRole("link", { name: /Kossi Mensah/ }).click();
  await expect(thread(moussa).getByText("Gardez le montant en entier")).toBeVisible();

  const text = `Merci Moussa, je corrige ce soir (${Date.now()})`;
  await kossi.getByLabel("Votre message").fill(text);
  await kossi.keyboard.press("Enter");
  await expect(thread(kossi).getByText(text)).toBeVisible();
  await expect(thread(moussa).getByText(text)).toBeVisible({ timeout: 10_000 });

  // The message survives a reload: it is in the database.
  await moussa.reload();
  await expect(thread(moussa).getByText(text)).toBeVisible();

  await kossi.context().close();
  await moussa.context().close();
});

test("la liste des discussions affiche les non-lus en direct", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const moussa = await signIn(browser, "moussa");
  await moussa.getByRole("link", { name: /Kossi Mensah/ }).click();

  const text = `Tu as vu mon dernier commit ? (${Date.now()})`;
  await moussa.getByLabel("Votre message").fill(text);
  await moussa.getByRole("button", { name: "Envoyer" }).click();

  const row = kossi.getByRole("link", { name: /Moussa Traoré/ });
  await expect(row).toContainText(text);
  await expect(row.getByLabel(/non lus/)).toBeVisible();

  await kossi.context().close();
  await moussa.context().close();
});

test("un groupe privé : le créateur choisit parmi ses contacts, tout le monde reçoit", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const yao = await signIn(browser, "yao");

  await kossi.goto("/messages/groupes/nouveau");
  // Hidden copies of earlier screens stay in the page: roles only match the visible one.
  await expect(kossi.getByRole("checkbox", { name: "Ajouter Chidi Okafor" })).toHaveCount(0); // not a contact
  await kossi.getByLabel("Nom du groupe").fill("Revue de code");
  await kossi.getByRole("checkbox", { name: "Ajouter Yao Koffi" }).check();
  await kossi.getByRole("checkbox", { name: "Ajouter Moussa Traoré" }).check();
  await kossi.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(thread(kossi).getByText("Kossi a créé le groupe et ajouté")).toBeVisible();

  // Yao sees the new group appear in his list, then receives messages live.
  await expect(yao.getByRole("link", { name: /Groupe Revue de code/ })).toBeVisible({ timeout: 10_000 });
  await yao.getByRole("link", { name: /Groupe Revue de code/ }).click();
  const text = `Je relis ta PR ce soir (${Date.now()})`;
  await kossi.getByLabel("Message au groupe").fill(text);
  await kossi.keyboard.press("Enter");
  await expect(thread(kossi).getByText(text)).toBeVisible();
  await expect(thread(yao).getByText(text)).toBeVisible({ timeout: 10_000 });

  // Only the creator can add participants.
  await expect(yao.getByRole("button", { name: "Ajouter des participants" })).toHaveCount(0);
  await expect(kossi.getByRole("button", { name: "Ajouter des participants" })).toBeVisible();

  await kossi.context().close();
  await yao.context().close();
});

test("accepter une invitation ouvre la conversation avec le premier message", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  await kossi.getByRole("tab", { name: /Invitations/ }).click();
  await kossi.getByRole("link", { name: /Fatou Sow/ }).click();
  await kossi.getByRole("button", { name: "Accepter" }).click();
  await expect(kossi).toHaveURL(/\/messages\/(?!invitations)[^/]+$/);
  await expect(thread(kossi).getByText("je cherche un testeur Android")).toBeVisible();
  await expect(thread(kossi).getByText("Kossi a accepté l’invitation")).toBeVisible();
  await kossi.context().close();
});
