import { expect, test, type Browser, type Page } from "@playwright/test";

/*
 * Real messaging: two or three members signed in at the same time, in separate browsers.
 * The demo data is reset before the run (e2e/global-setup.ts). Password of every demo account: kabad-demo-2026.
 */
const PASSWORD = "kabad-demo-2026";
/** Next.js keeps the previous screen hidden in the page: look inside the visible message thread only. */
const thread = (page: Page) => page.getByRole("main", { name: "Messages" });
const EMAIL = { kossi: "kossi.mensah@exemple.tg", yao: "yao.agbeko@exemple.tg", fatou: "fatou.sow@exemple.sn" } as const;

test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: keyof typeof EMAIL): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  await page.goto("/connexion?suite=/messages");
  await page.getByLabel("E-mail").fill(EMAIL[who]);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  return page;
}

test("la connexion refuse un mauvais mot de passe", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(EMAIL.kossi);
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
});

test("un message arrive chez l’autre membre sans recharger la page", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const yao = await signIn(browser, "yao");

  await kossi.getByRole("link", { name: /Yao Agbeko/ }).click();
  await yao.getByRole("link", { name: /Kossi Mensah/ }).click();
  await expect(thread(yao).getByText("Tu as avancé sur l’écran de paiement ?")).toBeVisible();

  const text = `Je corrige ce soir (${Date.now()})`;
  await kossi.getByRole("textbox").last().fill(text);
  await kossi.getByRole("button", { name: "Envoyer" }).click();
  await expect(thread(kossi).getByText(text)).toBeVisible();
  await expect(thread(yao).getByText(text)).toBeVisible({ timeout: 10_000 });

  // The message survives a reload: it is in the database.
  await yao.reload();
  await expect(thread(yao).getByText(text)).toBeVisible();

  await kossi.context().close();
  await yao.context().close();
});

test("un groupe privé avec un thème : tout le monde reçoit en direct, et son responsable le renomme", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const yao = await signIn(browser, "yao");

  await kossi.goto("/messages/groupes/nouveau");
  await kossi.getByLabel("Nom du groupe").fill("Revue de code");
  await kossi.getByRole("button", { name: "Entraide" }).click();
  await kossi.getByRole("checkbox", { name: /Yao Agbeko/ }).check();
  await kossi.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(thread(kossi).getByText(/Kossi a créé le groupe/)).toBeVisible();

  await expect(yao.getByRole("link", { name: /Revue de code/ })).toBeVisible({ timeout: 10_000 });
  await yao.getByRole("link", { name: /Revue de code/ }).click();
  const text = `Je relis ta PR ce soir (${Date.now()})`;
  await kossi.getByRole("textbox").last().fill(text);
  await kossi.getByRole("button", { name: "Envoyer" }).click();
  await expect(thread(yao).getByText(text)).toBeVisible({ timeout: 10_000 });

  // The owner renames the group from « Infos du groupe »: the other member reads it at once.
  await kossi.getByRole("button", { name: "Infos du groupe" }).click();
  await kossi.getByRole("button", { name: "Modifier" }).click();
  await kossi.locator("#group-name").fill("Revue de code du jeudi");
  await kossi.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(thread(yao).getByText("Kossi a renommé le groupe « Revue de code du jeudi »")).toBeVisible({ timeout: 10_000 });

  await kossi.context().close();
  await yao.context().close();
});

test("accepter une invitation ouvre la conversation avec le premier message", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  await kossi.goto("/messages/invitations");
  await kossi.getByRole("button", { name: "Accepter" }).first().click();
  await kossi.getByRole("link", { name: "Écrire" }).first().click();
  await expect(kossi).toHaveURL(/\/messages\/(?!invitations)[^/]+$/);
  await expect(thread(kossi).getByText(/a accepté l’invitation/)).toBeVisible();
  await kossi.context().close();
});

test("un PDF joint arrive chez l’autre membre et se télécharge", async ({ browser }) => {
  const kossi = await signIn(browser, "kossi");
  const yao = await signIn(browser, "yao");
  await kossi.getByRole("link", { name: /Yao Agbeko/ }).click();
  await yao.getByRole("link", { name: /Kossi Mensah/ }).click();

  const name = `specs-${Date.now()}.pdf`;
  await kossi.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n") });
  await expect(thread(kossi).getByRole("link", { name: new RegExp(name) })).toBeVisible();
  const card = thread(yao).getByRole("link", { name: new RegExp(name) });
  await expect(card).toBeVisible({ timeout: 10_000 });
  // Fetched by Yao's browser, with his session: the file is served as a PDF.
  const href = (await card.getAttribute("href"))!;
  const [status, type] = await yao.evaluate((u) => fetch(u).then((r) => [r.status, r.headers.get("content-type")]), href);
  expect(status).toBe(200);
  expect(type).toBe("application/pdf");

  await kossi.context().close();
  await yao.context().close();
});

test("en anglais, l’erreur de connexion arrive en anglais", async ({ page }) => {
  await page.goto("/en/connexion");
  await page.getByLabel("E-mail").fill(EMAIL.kossi);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});
